<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

# NestJS Chat and Authentication Practice

A small NestJS application demonstrating Socket.IO group/private chat and cookie-based authentication. Chat presence remains in memory; user accounts and refresh-token hashes are stored in `assets/users.json`. It uses no database, Redis, or microservices.

## Setup

```bash
npm install
npm run start:dev
```

The Socket.IO server listens at `http://localhost:3000` by default. Set `PORT` to use another port. Install a Socket.IO client such as the Socket.IO Client package in a separate test project, then connect to the namespaces below.

## Namespaces

- `/group` for group chat. It uses rooms named `group:<groupId>`.
- `/private` for one-to-one chat. It uses rooms named `private:<lower-user-id>:<higher-user-id>` so either participant produces the same room ID.

Each namespace has its own sockets and rooms. A socket connected to one namespace does not receive events from the other.

## Group API

Group definitions are stored in `assets/groups.json` with this shape:

```json
{
  "groupId": "developers",
  "users": [1, 2]
}
```

| Route | Request body | Result |
| --- | --- | --- |
| `POST /group` | `{ "groupId": "developers" }` | Creates a group with the authenticated user's ID in `users` |
| `DELETE /group/:groupId` | None | Deletes the group |
| `POST /group/:groupId/join` | No body | Adds the authenticated user's ID to the group's `users` array |
| `POST /group/:groupId/leave` | No body | Removes the authenticated user's ID from the group's `users` array |

All group routes require the `access_token` HTTP-only cookie from login or signup. The access-token guard verifies the JWT and puts its `sub` claim on `request.user.id`; clients cannot choose another user's ID. Duplicate groups or memberships return HTTP 409. Missing groups or memberships return HTTP 404. Group IDs are validated by the global validation pipe.

## Events

### `/group`

| Event | Direction | Payload / result |
| --- | --- | --- |
| `register-user` | Client to server | `{ "userId": "user123", "username": "Savan" }` |
| `join-group` | Client to server | `{ "groupId": "developers" }` |
| `user-joined` | Server to existing room members | `{ "groupId": "developers", "userId": "user123", "username": "Savan", "message": "Savan joined the developers group" }` |
| `leave-group` | Client to server | `{ "groupId": "developers" }` |
| `user-left` | Server to remaining room members | Includes `groupId`, `userId`, `username`, and a readable `message` |
| `send-group-message` | Client to server | `{ "groupId": "developers", "message": "Hello everyone!" }` |
| `group-message` | Server to other members of that room | `{ "groupId": "developers", "senderId": "user123", "senderName": "Savan", "message": "Hello everyone!" }` |

Register in the `/group` namespace before joining or sending messages. The sender is excluded from group join notifications and group message broadcasts; use the Socket.IO acknowledgement callback to receive the handler result.

### `/private`

| Event | Direction | Payload / result |
| --- | --- | --- |
| `register-user` | Client to server | `{ "userId": "user123", "username": "Savan" }` |
| `start-private-chat` | Client to server | `{ "receiverId": "user456" }` |
| `send-private-message` | Client to server | `{ "receiverId": "user456", "message": "Hey!" }` |
| `private-message` | Server to the sender and receiver in their shared room | `{ "senderId": "user123", "receiverId": "user456", "message": "Hey!" }` |

Both users must be registered in `/private`; the sender must start the chat before sending. The server keeps an in-memory map of online users and removes them on disconnect. Registration is identity-only and is not authentication.

Connection and disconnection are handled and logged separately for each namespace.

## Room behavior

The REST group's `users` array is persisted in `assets/groups.json`. Socket.IO still tracks active room membership independently and delivers group events only to the matching `group:<groupId>` room. Private room IDs sort the two user IDs before joining, producing the same room regardless of who starts the conversation. Only those two registered sockets are joined to the private room, so a third user cannot receive its messages.

## Manual client test

Connect clients with `io('http://localhost:3000/group')` or `io('http://localhost:3000/private')` from the Socket.IO Client package. Add listeners for the server-to-client events before emitting events. NestJS returns handler results through the acknowledgement callback when one is supplied.

1. Open three clients in `/group`. Register them as `user123` / `Savan`, `user456` / `Mina`, and `user789` / `Lee`.
2. Have Savan and Mina join `developers`; verify Mina receives Savan's `user-joined` event and Savan receives Mina's. Join Lee to `designers`.
3. Have Savan emit `send-group-message` with `{ "groupId": "developers", "message": "Hello everyone!" }`. Mina receives `group-message`; Lee does not. The sender does not receive its own group broadcast.
4. Have Mina leave `developers`; Savan receives `user-left`. Disconnect Lee and verify the server logs the disconnect and removes their group membership.
5. Open three clients in `/private`. Register the same three IDs and names. Start a chat from Savan with `{ "receiverId": "user456" }`.
6. Send `{ "receiverId": "user456", "message": "Hey!" }` using `send-private-message`. Savan and Mina receive `private-message`; Lee does not. Disconnect Mina and verify the server logs the disconnect and removes Mina from the online-user map.

## Authentication

User accounts and active refresh-token hashes are stored in `assets/users.json`, while passwords and refresh tokens are stored only as hashes. Passwords are hashed with bcrypt; JWTs are signed separately for access and refresh use. Access tokens last 15 minutes and refresh tokens last 7 days. Both are sent as HTTP-only cookies and are not included in response JSON. Refresh tokens are rotated after a successful refresh, and old tokens are rejected.

| Route | Request body | Result |
| --- | --- | --- |
| `POST /auth/signup` | `{ "username": "savan", "fullname": "Savan User", "password": "correct-horse-battery" }` | Creates account, sets cookies, returns public user |
| `POST /auth/login` | `{ "username": "savan", "password": "correct-horse-battery" }` | Verifies password, sets cookies, returns public user |
| `POST /auth/refresh` | No body; sends the `refresh_token` cookie | Rotates both cookies and returns public user |

Usernames must be 3-30 characters, passwords 8-72 characters and at most 72 UTF-8 bytes, and full names at most 80 characters. Unknown properties and invalid payloads are rejected with HTTP 400. Invalid credentials or refresh tokens return HTTP 401; duplicate usernames return HTTP 409.

The cookies are named `access_token` and `refresh_token`, both `HttpOnly` and `SameSite=Lax`. The refresh cookie is scoped to `/auth/refresh`. The `Secure` flag is enabled when `NODE_ENV=production`. Configure distinct `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET` values in production; development-only fallback secrets are used otherwise, and production startup fails if either secret is missing.

Example signup:

```bash
curl -i http://localhost:3000/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"username":"savan","fullname":"Savan User","password":"correct-horse-battery"}'
```

Browsers automatically send the refresh cookie to `POST /auth/refresh`. Non-browser clients should retain the `Set-Cookie` values and send the refresh cookie on that route.

```bash
npm test
npm run build
npm run test:e2e
```

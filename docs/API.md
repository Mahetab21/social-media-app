# API walkthrough

Base URL: `http://localhost:5000`. Full operations are in `/api-docs/` and [swagger.json](../swagger.json). Use IDs and codes returned by your own API.

## Accounts

Register with `POST /users/signUp`:

```json
{"fName":"Mahitab","lName":"Ayman","email":"you@example.com","password":"UseYourOwnPassword1","cPassword":"UseYourOwnPassword1","age":22,"gender":"female"}
```

Confirm with `PATCH /users/confirmEmail`:

```json
{"email":"you@example.com","otp":"123456"}
```

Replace the example code with the emailed one. Resend via `POST /users/resendConfirmation`. Sign in at `POST /users/signIn` or `/users/logIn` with `email` and `password`. If `twoFactor: true`, send email and the login code to `POST /users/confirmTwoFactorLogin`; no token is issued before that step.

Send `Authorization: Bearer <access_token>` for users and `Authorization: Admin <access_token>` for administrators. On `GET /users/refreshToken`, send the refresh token with the same prefix and store the replacement tokens.

Password reset: request a code at `PATCH /users/forgetPassword`, then send `email`, `otp`, `password`, `cPassword` to `PATCH /users/resetPassword`.

## Posts and threaded comments

Create with `POST /posts/createPost`:

```json
{"content":"My first post","availability":"friends","allowComments":"allow"}
```

Visibility is `public`, `friends` or `private`. Browse `GET /posts/getPost?page=1&limit=10`. Like with `PATCH /posts/:postId?action=like` (or `unlike`). Edit at `PATCH /posts/update/:postId`. Only the author may modify, freeze or delete content.

Image uploads use at most two multipart files named `attachments`, each up to 5 MiB. Multipart `tags` must be a JSON array string.

Create a comment at `POST /posts/:postId/comments`:

```json
{"content":"A useful discussion","onModel":"post"}
```

Reply at `POST /posts/:postId/comments/:commentId`:

```json
{"content":"My reply","onModel":"Comment"}
```

List top-level comments with `GET /posts/:postId/comments`. Read a comment and paginated replies at `GET /posts/:postId/comments/:commentId`. Both enforce root-post visibility and reject hidden/missing ancestors.

## Friendships and chat

| Action | Endpoint |
| --- | --- |
| Send request | `POST /users/friendRequest/:userId` |
| Accept incoming request | `PATCH /users/acceptRequest/:requestId` |
| Cancel/decline pending request | `DELETE /users/deleteFriendRequest/:friendRequestId` |
| Remove friendship | `DELETE /users/unFriend/:friendId` |
| Block | `PATCH /users/blockUser/:userId` |
| Direct history | `GET /users/:userId/chat?page=1&limit=10` |
| Create group | `POST /chat/group` |
| Group history | `GET /chat/group/:groupId?page=1&limit=10` |

Create a group with `{"group":"Study group","participants":["FRIEND_USER_ID"]}`. The creator is included automatically. Participants must be distinct current friends. Multipart group-image uploads use `attachment` and a JSON array string for participants.

History is oldest-first; `totalMessages` counts messages rather than chat documents.

## Socket.IO

The socket server shares the API port. Try `/socket-demo/` with two confirmed, mutually connected test accounts.

```javascript
const socket = io("http://localhost:5000", {
  auth: { authorization: "Bearer YOUR_ACCESS_TOKEN" }
});
socket.emit("sendMessage", { sendTo: "FRIEND_USER_ID", content: "Hello!" },
  result => console.log(result));
socket.on("newMessage", message => console.log(message));
socket.on("eventError", error => console.log(error));
```

| Event | Payload / result |
| --- | --- |
| `sendMessage` | `{ sendTo, content }`; mutual friendship required |
| `join_room` | `{ roomId }`; group membership required |
| `sendGroupMessage` | `{ groupId, content }`; group membership required |
| `newMessage` | Incoming content and a public sender summary |
| `successMessage` | Confirmation to the sender's active connections |
| Acknowledgement | `{ ok: true, data }` or `{ ok: false, error }` |

Events are validated and limited to 60 per minute per connection. Sending and receiving sessions are rechecked. Sender summaries contain no password, OTP or email.

## GraphQL

Send an authenticated `POST /graphql` request:

```graphql
query {
  getPosts(page: 1, limit: 10) {
    countDocument currentPage numberOfPages
    posts { content attachments createdBy }
  }
}
```

```graphql
mutation { likePost(postId: "POST_ID", action: like) }
```

`getOneUser(id: ...)`, `getAllUser(page: ..., limit: ...)` and `createUser(...)` require an administrator. Passwords are not exposed in the schema.

## Profile uploads

- Direct: `POST /users/uploadImage`, multipart field `image`.
- Signed PUT: `POST /users/uploadImages` with `{"originalname":"profile.jpg","ContentType":"image/jpeg"}`. Upload to the returned URL with the same Content-Type, then call `POST /users/confirmProfileImage` within five minutes.
- S3 keys stay private. There is no anonymous download or delete endpoint.

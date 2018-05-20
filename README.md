# Noteful: A note taking app

This app is meant to give students experience with building REST APIs with Node, Express, JWT-based auth, Mongo, and Mongoose.

It is also provided as a backend that curriculum contributors, instructors, and students can run locally to build clients that provide a GUI for this API.

[Full API spec available here](https://documenter.getpostman.com/view/1161985/RVu4GVFE)

## Seed db and run server

1. Clone the repo.
1. `cd` into it.
1. `npm install`
1. Make sure you have Mongo installed and running locally.
1. Rename the `.env.example` file to `.env`. This file sets up any config vars that you'll need to run this app locally.
1. Run `node utils/seed-database.js`
1. The seed process inserts three users: `user0`, `user1`, and `user2` with the password `password`.
1. Run `npm start` to start the dev server.
1. To access a protected endpoint
    1. POST the username + password to `/api/login`
    1. Copy the authToken value
    1. Add token `Authorization` header as a Bearer Token

If you need to zero out the database, you can run `node util/drop-database.js`

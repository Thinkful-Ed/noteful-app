'use strict';

const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');

const { JWT_SECRET } = require('../config');

const options = {
  secretOrKey: JWT_SECRET,
  // Look for the JWT as a Bearer auth header
  jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('Bearer'),
  // Only allow HS256 tokens - the same as the ones we issue
  algorithms: ['HS256']
};

const jwtStrategy = new JwtStrategy(options, (payload, done) => {
  done(null, payload.user);
});

module.exports = jwtStrategy;
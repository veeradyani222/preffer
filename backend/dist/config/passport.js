"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const user_service_1 = __importDefault(require("../services/user.service"));
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error('Google Client ID and Secret are required');
}
passport_1.default.use(new passport_google_oauth20_1.Strategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    scope: ['profile', 'email']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        if (!profile.emails || profile.emails.length === 0) {
            return done(new Error('No email found in Google profile'), null);
        }
        // Extract user data from Google profile
        const googleUser = {
            googleId: profile.id,
            email: profile.emails[0].value,
            displayName: profile.displayName,
            profilePicture: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null
        };
        // Find or create user in database
        const user = await user_service_1.default.findOrCreateGoogleUser(googleUser);
        return done(null, user);
    }
    catch (error) {
        return done(error, null);
    }
}));
// Serialize user for session (not needed if using JWT only, but good practice to keep)
passport_1.default.serializeUser((user, done) => {
    done(null, user.id);
});
passport_1.default.deserializeUser(async (id, done) => {
    try {
        const user = await user_service_1.default.findById(id);
        done(null, user);
    }
    catch (error) {
        done(error, null);
    }
});
exports.default = passport_1.default;

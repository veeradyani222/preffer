import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import UserService from '../services/user.service';

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error('Google Client ID and Secret are required');
}

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL,
            scope: ['profile', 'email']
        },
        async (accessToken: string, refreshToken: string, profile: Profile, done: (error: any, user?: any) => void) => {
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
                const user = await UserService.findOrCreateGoogleUser(googleUser);

                return done(null, user);
            } catch (error) {
                return done(error, null);
            }
        }
    )
);

// Serialize user for session (not needed if using JWT only, but good practice to keep)
passport.serializeUser((user: any, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
    try {
        const user = await UserService.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

export default passport;

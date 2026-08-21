-- Canonicalize existing user emails to lowercase (app now stores/matches lowercase).
UPDATE "User" SET email = lower(email) WHERE email <> lower(email);

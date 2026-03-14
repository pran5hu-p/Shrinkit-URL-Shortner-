import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { tokenPostRequestSchema } from '../validation/token.validation.js';

const JWT_SECRET = process.env.JWT_SECRET;

export async function createUserToken(payload){
    const validationResult = await tokenPostRequestSchema.safeParseAsync(payload);

    if(validationResult.error){
        throw new Error(validationResult.error.message);
    }

    const validatedPayload = validationResult.data;

    const token = jwt.sign(validatedPayload, JWT_SECRET);

    return token;
}

export function verifyUserToken(token){
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        return payload;
    } catch (error) {
        return null;
    }
}
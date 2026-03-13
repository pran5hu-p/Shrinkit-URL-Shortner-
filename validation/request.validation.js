import {z} from 'zod';
export const signupPostRequestSchema = z.object({
    firstname: z.string(),
    lastname: z.string().optional(),
    email: z.string().email(),
    password : z.string().min(3),
});

export const loginPostRequestSchema = z.object({
    email: z.string().email(),
    password : z.string().min(3),
})
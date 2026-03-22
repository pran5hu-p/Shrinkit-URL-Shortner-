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

export const shortenpostRequestSchema = z.object({
    url: z.string().url(),
    code: z.string().min(3).max(20).optional().or(z.literal("")),
    description: z.string().max(150).optional().nullable(),
    expiresAt: z.string().datetime().optional().nullable(),
    password: z.string().optional().nullable(),
    isCollection: z.boolean().default(false),
    collectionLinks: z.array(
        z.object({
            label: z.string().min(1),
            url: z.string()
        })
    ).optional().default([]),
});
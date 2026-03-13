import {z} from 'zod';
export const tokenPostRequestSchema = z.object({
    id: z.string(),
})
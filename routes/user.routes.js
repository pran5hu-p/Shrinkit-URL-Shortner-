import express from 'express';
const router = express.Router();
import {db} from '../db/index.js';
import { eq } from 'drizzle-orm';
import { usersTable } from '../models/index.js';
import {loginPostRequestSchema, signupPostRequestSchema} from '../validation/request.validation.js';
import {hashPasswordWithSalt} from '../utils/hash.js';
import { getUserByEmail, insertUser } from '../services/user.service.js';
import { createUserToken } from '../utils/token.js';

router.post('/signup', async(req,res) => {
    const validationResult = await signupPostRequestSchema.safeParseAsync(req.body);
    
    if(validationResult.error){
        return res.status(400).json({error: validationResult.error.message});
    }

    const {firstname, lastname, email, password} = validationResult.data;

    const existingUser = await getUserByEmail(email);
    
    if(existingUser){
        return res.status(400).json({error: 'User with this email already exists'});
    }
    
    const { salt, hashedPassword } = hashPasswordWithSalt(password);
    
    const user = await insertUser({ 
        firstname, 
        lastname, 
        email, 
        password: hashedPassword,
        salt 
    });

    return res.status(201).json({data: {userId: user.id}});
})

router.post('/login', async(req, res) => {
    const validationResult = await loginPostRequestSchema.safeParseAsync(req.body);

    if(validationResult.error){
        return res.status(400).json({error: validationResult.error.message});
    }

    const {email, password} = validationResult.data;

    const user = await getUserByEmail(email);

    if(!user){
        return res.status(400).json({error: 'Invalid email'});
    }

    const {salt, hashedPassword} = hashPasswordWithSalt(password, user.salt);

    if(hashedPassword !== user.password){
        return res.status(400).json({error: 'Invalid password'});
    }

    const token = await createUserToken({id: user.id});

    return res.status(200).json({token});
})

export default router;
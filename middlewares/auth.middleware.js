import express from 'express';
import { verifyUserToken } from '../utils/token.js';

export function authenicationMiddleware(req, res, next){
    const authHeader = req.headers['authorization'];

    if(!authHeader){
        return next();
    }

    if(!authHeader.startswith('Bearer ')){
        return res.status(401).json({error: 'Invalid authorization header format'});
    }

    const token = authHeader.split(" ")[1];

    const payload = verifyUserToken(token);

    req.user = payload;
    next();
}
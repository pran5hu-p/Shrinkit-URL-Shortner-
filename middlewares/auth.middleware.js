import express from 'express';
import { verifyUserToken } from '../utils/token.js';

export function authenticationMiddleware(req, res, next){
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];

    if(!authHeader){
        return next();
    }

    if(!authHeader.startsWith('Bearer ')){
        return res.status(401).json({error: 'Invalid authorization header format'});
    }

    try {
        const token = authHeader.split(' ')[1];
        const payload = verifyUserToken(token);
        
        if (!payload) {
            return res.status(401).json({ error: 'Session expired. Please login again' });
        }

        req.user = payload;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

export function ensureAuthenticated(req, res, next){
    if(!req.user || !req.user.id){
        return res.status(401).json({ error: 'You must be logged in to perform this action' });
    }
    next();
}
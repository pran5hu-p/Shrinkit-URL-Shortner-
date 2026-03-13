import express from 'express';
import userRouter from './routes/user.routes.js';
import { authenicationMiddleware } from './middlewares/auth.middleware.js';
const app = express();
const PORT = process.env.PORT ?? 8000

app.use(express.json());
app.use(authenicationMiddleware);


app.get('/', (req,res) => {
    return res.json({status: 'server is up and running!'})
})

app.use('/user', userRouter);

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));


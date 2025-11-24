import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
// import { auth } from 'express-oauth2-jwt-bearer'; //This is Auth0 package for handling jwt tokens with express.js

const app = express();

app.use(cors({ origin: '*' }));
// app.use((req, res, next) => req.headers['authorization'] ? next() : res.status(401).end());
// app.use(auth());
app.use(helmet());
app.use(express.json());

app.get('/', (req, res) => res.send('working fine :D'));

import operationsRouter from './operations/operationsRouter.js';
app.use('/operations', operationsRouter);

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

export default app;
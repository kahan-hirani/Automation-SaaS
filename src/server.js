import express from 'express';
import dotenv from 'dotenv';
import morgan from 'morgan';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';


import sequelize from './config/database.js';
import errorMiddleware from './middlewares/error.middlware.js';
import indexRoutes from './routes/index.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT;

sequelize.authenticate()
  .then(() => console.log("Database connected successfully"))
  .catch(err => console.error("Unable to connect to the database:", err));

sequelize.sync();

app.get('/', (req, res) => {
  res.send('Hello kahan');
});

app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());
app.use(helmet());

app.use('/api/v1', indexRoutes);

app.use(errorMiddleware);


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

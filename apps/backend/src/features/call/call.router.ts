import { Router } from 'express';
import * as callController from './call.controller';

export const callRouter = Router();

callRouter.get('/', callController.getCallHistory);
callRouter.get('/:id', callController.getCallDetails);

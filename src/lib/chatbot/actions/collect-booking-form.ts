import type { ActionHandler } from '../engine';

// Signals the frontend to render a booking form — not a message node
export const collectBookingForm: ActionHandler = async (_params, session) => {
  return {
    message: '__RENDER_FORM:booking__', // sentinel — frontend checks this prefix
    next: 'confirm',
  };
};

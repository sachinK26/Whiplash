import { configureStore } from '@reduxjs/toolkit';
// Slices will be added in later phases
// import authReducer from './slices/authSlice';

export const store = configureStore({
  reducer: {
    // auth: authReducer,
  },
});

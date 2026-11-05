import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Pages (stubs — will be built out in later phases)
const Home = () => <div style={{ color: '#fff', textAlign: 'center', marginTop: '20vh' }}><h1>Whiplash</h1></div>;
const Login = () => <div style={{ color: '#fff' }}><h2>Login</h2></div>;
const Register = () => <div style={{ color: '#fff' }}><h2>Register</h2></div>;

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </Router>
  );
}

export default App;

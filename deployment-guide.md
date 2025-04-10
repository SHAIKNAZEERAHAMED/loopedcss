# Loop(CSS) Deployment Guide

This guide will help you deploy your Loop(CSS) social media platform to production.

## Prerequisites

- A Firebase account with Realtime Database and Storage set up
- A Vercel account for hosting the Next.js application
- Node.js and npm installed on your local machine

## Step 1: Set Up Firebase

1. Create a Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Enable Authentication with Email/Password and Google providers
3. Create a Realtime Database
4. Set up Firebase Storage
5. Configure Firebase Security Rules (see database-rules.json)
6. Get your Firebase configuration (apiKey, authDomain, etc.)

## Step 2: Set Up Environment Variables

Create a `.env.local` file in your project root with the following variables:


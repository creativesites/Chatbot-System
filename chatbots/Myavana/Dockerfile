# Use the official Node.js 18 runtime as a parent image
FROM node:18-slim

# Set the working directory in the container
WORKDIR /app

# Copy package.json, lockfile, and local vendor packages
COPY package*.json ./
COPY pnpm-lock.yaml* ./
COPY vendor ./vendor

# Install pnpm globally
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the source code
COPY . .

# Expose the port the app runs on (Cloud Run will set PORT env var)
EXPOSE 8080

# Set default environment to production
ENV NODE_ENV=production

# Define the command to run the application
CMD ["node", "index.js"]
FROM node:20-alpine

WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm ci

# Copy application code
COPY . .

# Build the application
RUN npm run build

# Expose port for the server
EXPOSE 5000

# Set environment variables
ENV NODE_ENV=production
ENV USE_DATABASE=true

# Command to run the server
CMD ["npm", "start"]
FROM node:20-alpine

WORKDIR /app

# Install netcat for health checking
RUN apk add --no-cache netcat-openbsd

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

# Copy and set entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
ENTRYPOINT ["docker-entrypoint.sh"]

# Command to run the server
CMD ["npm", "start"]
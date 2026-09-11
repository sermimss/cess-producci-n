FROM node:18-alpine

# Use a working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (if available) for dependency installation
COPY package*.json ./

# Install dependecies
RUN npm install --production

# Copy the rest of the source code
COPY . .

# Expose the API port
EXPOSE 3001

# Start the node application
CMD ["npm", "start"]

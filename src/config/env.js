require('dotenv').config();

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),

  db: {
    // 'mongodb' | 'mysql' | 'both' | 'mongodb,mysql'
    type: process.env.DB_TYPE || 'mongodb',
    // when DB_TYPE enables multiple backends, this is the default
    defaultType: process.env.DB_DEFAULT || process.env.DB_TYPE || 'mongodb',

    mongodb: {
      uri: process.env.MONGODB_URI,
      uriReadOnly: process.env.MONGODB_URI_READ_ONLY,
      options: {
        autoIndex: false,
        maxPoolSize: 20,
        minPoolSize: 5,
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
        family: 4,
        authSource: 'admin',
        retryWrites: true,
        tls: true,
        tlsInsecure: true
      },
      optionsReadOnly: {
        autoIndex: false,
        maxPoolSize: 100,
        minPoolSize: 5,
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
        family: 4,
        authSource: 'admin',
        retryWrites: true,
        tls: true,
        tlsInsecure: true
      }
    },

    mysql: {
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT || '3306', 10),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      readHost: process.env.MYSQL_READ_HOST,
      readPort: parseInt(process.env.MYSQL_READ_PORT || process.env.MYSQL_PORT || '3306', 10),
      maxPoolSize: parseInt(process.env.MYSQL_MAX_POOL || '20', 10),
      readMaxPoolSize: parseInt(process.env.MYSQL_READ_MAX_POOL || '100', 10)
    }
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },

  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10)
};


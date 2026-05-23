/**
 * OpenAPI spec for this project.
 * Kept as a plain JS object (no swagger-jsdoc required).
 */

const dbTypeParam = { $ref: '#/components/parameters/DbTypeHeader' };
const dbQueryParam = { $ref: '#/components/parameters/DbQueryParam' };
const dbParams = [dbTypeParam, dbQueryParam];

const dbUsedHeader = { 'x-db-used': { $ref: '#/components/headers/DbUsed' } };

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'MongoDB ↔ MySQL Wrapper API',
    version: '1.0.0',
    description:
      'A Node.js Express API that can run on MongoDB, MySQL, or both simultaneously. When running with DB_TYPE=both, choose the backend per request via header x-db-type.'
  },
  servers: [{ url: 'http://localhost:3000' }],
  tags: [
    { name: 'Health' },
    { name: 'Auth' },
    { name: 'Users' },
    { name: 'Posts' },
    { name: 'Demo' },
    { name: 'Envelopes' },
    { name: 'Migration' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    headers: {
      DbUsed: {
        description: 'Database used for this request (set by middleware)',
        schema: { type: 'string', enum: ['mongodb', 'mysql'] }
      }
    },
    parameters: {
      DbTypeHeader: {
        name: 'x-db-type',
        in: 'header',
        required: false,
        schema: { type: 'string', enum: ['mongodb', 'mysql'] },
        description:
          "When DB_TYPE=both, selects which DB backend to use for this request. If not provided, the server uses DB_DEFAULT."
      },
      DbQueryParam: {
        name: 'db',
        in: 'query',
        required: false,
        schema: { type: 'string', enum: ['mongodb', 'mysql'] },
        description: "Alternative to x-db-type header (e.g. ?db=mysql)."
      }
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Validation error' },
          errors: { type: 'array', items: { type: 'string' } },
          error: { type: 'string' }
        }
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 10 },
          total: { type: 'integer', example: 42 },
          pages: { type: 'integer', example: 5 }
        }
      },
      User: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            description: 'MongoDB id (ObjectId as string)',
            example: '6797a4d7e41a356bb91cee8c'
          },
          id: {
            type: 'integer',
            description: 'MySQL id (auto-increment integer)',
            example: 1
          },
          email: { type: 'string', example: 'test@example.com' },
          name: { type: 'string', example: 'Test User' },
          role: { type: 'string', enum: ['user', 'admin'], example: 'user' },
          createdAt: { type: 'integer', example: 1769448663026 },
          updatedAt: { type: 'integer', example: 1769448663026 }
        }
      },
      Post: {
        type: 'object',
        properties: {
          _id: { type: 'string', description: 'MongoDB id (ObjectId as string)' },
          id: { type: 'integer', description: 'MySQL id (auto-increment integer)' },
          userId: { type: 'string', description: 'Owner user id (stringified)' },
          title: { type: 'string', example: 'Hello world' },
          content: { type: 'string', example: 'My first post' },
          status: { type: 'string', enum: ['draft', 'published', 'archived'], example: 'draft' },
          createdAt: { type: 'integer', example: 1769448663026 },
          updatedAt: { type: 'integer', example: 1769448663026 }
        }
      },
      Envelope: {
        type: 'object',
        properties: {
          _id: { type: 'string', description: 'MongoDB internal id (optional)' },
          id: { type: 'integer', description: 'MySQL row id (optional)' },
          EId: { type: 'string', example: 'E_1769448663026_ab12cd34ef56' },
          ETId: { type: 'string', example: 'ET-1' },
          SV: { type: 'integer', example: 1 },
          ORGId: { oneOf: [{ type: 'string' }, { type: 'number' }], example: 'ORG-1' },
          ES: { type: 'integer', example: 10 },
          CreatedAt: { type: 'integer', example: 1769448663026 },
          OrderNumber: { type: 'integer', example: 1769448663026 },
          Data: { type: 'string', example: 'hello' },
          DH: { type: 'string', description: 'sha256(Data)', example: '...' },
          FH: { type: 'string', nullable: true },
          SL: { type: 'string', nullable: true }
        }
      },
      SignupRequest: {
        type: 'object',
        required: ['email', 'password', 'name'],
        properties: {
          email: { type: 'string', example: 'test+123@example.com' },
          password: { type: 'string', example: 'test123456' },
          name: { type: 'string', example: 'Test User' },
          role: { type: 'string', enum: ['user', 'admin'], example: 'user' }
        }
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', example: 'test+123@example.com' },
          password: { type: 'string', example: 'test123456' }
        }
      }
    }
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    database: { type: 'string', example: 'mongodb' },
                    enabledDatabases: { type: 'array', items: { type: 'string' } },
                    timestamp: { type: 'string', example: '2026-01-26T17:30:14.772Z' }
                  }
                }
              }
            }
          }
        }
      }
    },

    '/api/auth/signup': {
      post: {
        tags: ['Auth'],
        summary: 'Signup',
        parameters: dbParams,
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/SignupRequest' } }
          }
        },
        responses: {
          201: {
            description: 'User registered',
            headers: dbUsedHeader,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'User registered successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        user: { $ref: '#/components/schemas/User' },
                        token: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          },
          400: { description: 'Validation error', headers: dbUsedHeader, content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          409: { description: 'Email already exists', headers: dbUsedHeader, content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },

    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        parameters: dbParams,
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } }
        },
        responses: {
          200: {
            description: 'Login successful',
            headers: dbUsedHeader,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Login successful' },
                    data: {
                      type: 'object',
                      properties: {
                        user: { $ref: '#/components/schemas/User' },
                        token: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          },
          400: { description: 'Validation error', headers: dbUsedHeader, content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          401: { description: 'Invalid credentials', headers: dbUsedHeader, content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },

    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current user',
        parameters: dbParams,
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Current user',
            headers: dbUsedHeader,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { success: { type: 'boolean', example: true }, data: { $ref: '#/components/schemas/User' } }
                }
              }
            }
          },
          401: { description: 'Token missing / user not found', headers: dbUsedHeader, content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          403: { description: 'Invalid token', headers: dbUsedHeader, content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },

    '/api/users': {
      get: {
        tags: ['Users'],
        summary: 'List users (admin only)',
        parameters: [
          ...dbParams,
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'sort', in: 'query', schema: { type: 'string', default: '-createdAt' } }
        ],
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Users list',
            headers: dbUsedHeader,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        users: { type: 'array', items: { $ref: '#/components/schemas/User' } },
                        pagination: { $ref: '#/components/schemas/Pagination' }
                      }
                    }
                  }
                }
              }
            }
          },
          401: { description: 'Unauthorized', headers: dbUsedHeader, content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          403: { description: 'Forbidden (not admin)', headers: dbUsedHeader, content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },

    '/api/users/search': {
      get: {
        tags: ['Users'],
        summary: 'Search users by email/name (admin only)',
        parameters: [...dbParams, { name: 'q', in: 'query', required: true, schema: { type: 'string' } }],
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Search results',
            headers: dbUsedHeader,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { success: { type: 'boolean', example: true }, data: { type: 'array', items: { $ref: '#/components/schemas/User' } } }
                }
              }
            }
          },
          400: { description: 'Missing q', headers: dbUsedHeader, content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          401: { description: 'Unauthorized', headers: dbUsedHeader, content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          403: { description: 'Forbidden', headers: dbUsedHeader, content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },

    '/api/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Get user by id (self or admin)',
        parameters: [...dbParams, { name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'User',
            headers: dbUsedHeader,
            content: {
              'application/json': {
                schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { $ref: '#/components/schemas/User' } } }
              }
            }
          },
          401: { description: 'Unauthorized', headers: dbUsedHeader, content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          403: { description: 'Forbidden', headers: dbUsedHeader, content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          404: { description: 'Not found', headers: dbUsedHeader, content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      },
      put: {
        tags: ['Users'],
        summary: 'Update user (self or admin)',
        parameters: [...dbParams, { name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                minProperties: 1,
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string' },
                  password: { type: 'string' },
                  role: { type: 'string', enum: ['user', 'admin'] }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Updated user',
            headers: dbUsedHeader,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'User updated successfully' },
                    data: { $ref: '#/components/schemas/User' }
                  }
                }
              }
            }
          },
          400: { description: 'Validation error', headers: dbUsedHeader, content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          401: { description: 'Unauthorized', headers: dbUsedHeader, content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          403: { description: 'Forbidden', headers: dbUsedHeader, content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          404: { description: 'Not found', headers: dbUsedHeader, content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          409: { description: 'Email already in use', headers: dbUsedHeader, content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      },
      delete: {
        tags: ['Users'],
        summary: 'Delete user (admin only)',
        parameters: [...dbParams, { name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Deleted',
            headers: dbUsedHeader,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { success: { type: 'boolean', example: true }, message: { type: 'string', example: 'User deleted successfully' } }
                }
              }
            }
          },
          401: { description: 'Unauthorized', headers: dbUsedHeader, content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          403: { description: 'Forbidden', headers: dbUsedHeader, content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          404: { description: 'Not found', headers: dbUsedHeader, content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },

    '/api/posts/search': {
      get: {
        tags: ['Posts'],
        summary: 'Search posts (own posts unless admin)',
        parameters: [...dbParams, { name: 'q', in: 'query', required: true, schema: { type: 'string' } }],
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Posts',
            headers: dbUsedHeader,
            content: {
              'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: { $ref: '#/components/schemas/Post' } } } } }
            }
          }
        }
      }
    },

    '/api/posts': {
      post: {
        tags: ['Posts'],
        summary: 'Create post',
        parameters: dbParams,
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title'],
                properties: {
                  title: { type: 'string' },
                  content: { type: 'string', nullable: true },
                  status: { type: 'string', enum: ['draft', 'published', 'archived'] }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Created',
            headers: dbUsedHeader,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Post created successfully' },
                    data: { $ref: '#/components/schemas/Post' }
                  }
                }
              }
            }
          }
        }
      },
      get: {
        tags: ['Posts'],
        summary: 'List posts (own posts unless admin)',
        parameters: [
          ...dbParams,
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'sort', in: 'query', schema: { type: 'string', default: '-createdAt' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['draft', 'published', 'archived'] } }
        ],
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Posts list',
            headers: dbUsedHeader,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        posts: { type: 'array', items: { $ref: '#/components/schemas/Post' } },
                        pagination: { $ref: '#/components/schemas/Pagination' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },

    '/api/posts/{id}': {
      get: {
        tags: ['Posts'],
        summary: 'Get post by id (owner or admin)',
        parameters: [...dbParams, { name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Post', headers: dbUsedHeader, content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/Post' } } } } } },
          404: { description: 'Not found', headers: dbUsedHeader, content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      },
      put: {
        tags: ['Posts'],
        summary: 'Update post (owner or admin)',
        parameters: [...dbParams, { name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                minProperties: 1,
                properties: {
                  title: { type: 'string' },
                  content: { type: 'string', nullable: true },
                  status: { type: 'string', enum: ['draft', 'published', 'archived'] }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Updated', headers: dbUsedHeader, content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' }, data: { $ref: '#/components/schemas/Post' } } } } } }
        }
      },
      delete: {
        tags: ['Posts'],
        summary: 'Delete post (owner or admin)',
        parameters: [...dbParams, { name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Deleted', headers: dbUsedHeader, content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' } } } } } }
        }
      }
    },

    '/api/demo/posts/bulk': {
      post: {
        tags: ['Demo'],
        summary: 'Demo: bulk create posts (insertMany)',
        parameters: dbParams,
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  count: { type: 'integer', minimum: 1, maximum: 100, default: 5 },
                  prefix: { type: 'string', default: 'bulk' }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Created',
            headers: dbUsedHeader,
            content: {
              'application/json': {
                schema: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' }, data: { type: 'object', properties: { insertedCount: { type: 'integer' } } } } }
              }
            }
          }
        }
      }
    },

    '/api/demo/posts/publish-many': {
      patch: {
        tags: ['Demo'],
        summary: 'Demo: publish many posts (updateMany)',
        parameters: dbParams,
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  fromStatus: { type: 'string', enum: ['draft', 'published', 'archived'], default: 'draft' },
                  toStatus: { type: 'string', enum: ['draft', 'published', 'archived'], default: 'published' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'OK', headers: dbUsedHeader, content: { 'application/json': { schema: { type: 'object' } } } }
        }
      }
    },

    '/api/demo/posts/delete-many': {
      delete: {
        tags: ['Demo'],
        summary: 'Demo: delete many posts (deleteMany)',
        parameters: dbParams,
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['draft', 'published', 'archived'] } } } } }
        },
        responses: {
          200: { description: 'OK', headers: dbUsedHeader, content: { 'application/json': { schema: { type: 'object' } } } }
        }
      }
    },

    '/api/demo/posts/count': {
      get: {
        tags: ['Demo'],
        summary: 'Demo: count posts (count)',
        parameters: [...dbParams, { name: 'status', in: 'query', schema: { type: 'string', enum: ['draft', 'published', 'archived'] } }],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'OK', headers: dbUsedHeader, content: { 'application/json': { schema: { type: 'object' } } } }
        }
      }
    },

    '/api/demo/posts/aggregate': {
      post: {
        tags: ['Demo'],
        summary: 'Demo: aggregate posts (aggregate)',
        parameters: dbParams,
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['pipeline'],
                properties: { pipeline: { type: 'array', items: { type: 'object' } } }
              }
            }
          }
        },
        responses: { 200: { description: 'OK', headers: dbUsedHeader, content: { 'application/json': { schema: { type: 'object' } } } } }
      }
    },

    '/api/envelopes': {
      post: {
        tags: ['Envelopes'],
        summary: 'Create envelope',
        parameters: dbParams,
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['ETId', 'SV', 'ORGId'],
                properties: {
                  ETId: { type: 'string' },
                  SV: { type: 'integer' },
                  ORGId: { oneOf: [{ type: 'string' }, { type: 'number' }] },
                  ES: { type: 'integer', default: 10 },
                  OrderNumber: { type: 'integer' },
                  Data: { type: 'string', nullable: true, default: '' },
                  FH: { type: 'string', nullable: true },
                  SL: { type: 'string', nullable: true }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Created', headers: dbUsedHeader, content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/Envelope' } } } } } }
        }
      },
      get: {
        tags: ['Envelopes'],
        summary: 'List envelopes',
        parameters: [
          ...dbParams,
          { name: 'ES', in: 'query', schema: { type: 'integer' } },
          { name: 'ORGId', in: 'query', schema: { type: 'string' } },
          { name: 'ETId', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'skip', in: 'query', schema: { type: 'integer', default: 0 } },
          { name: 'sort', in: 'query', schema: { type: 'string', default: '-CreatedAt' } }
        ],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'OK', headers: dbUsedHeader, content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: { $ref: '#/components/schemas/Envelope' } } } } } } }
        }
      }
    },

    '/api/envelopes/{EId}': {
      get: {
        tags: ['Envelopes'],
        summary: 'Get envelope by EId',
        parameters: [...dbParams, { name: 'EId', in: 'path', required: true, schema: { type: 'string' } }],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'OK', headers: dbUsedHeader, content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/Envelope' } } } } } },
          404: { description: 'Not found', headers: dbUsedHeader, content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      },
      put: {
        tags: ['Envelopes'],
        summary: 'Update envelope by EId',
        parameters: [...dbParams, { name: 'EId', in: 'path', required: true, schema: { type: 'string' } }],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                minProperties: 1,
                properties: {
                  ES: { type: 'integer' },
                  Data: { type: 'string', nullable: true },
                  FH: { type: 'string', nullable: true },
                  SL: { type: 'string', nullable: true },
                  OrderNumber: { type: 'integer' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'OK', headers: dbUsedHeader, content: { 'application/json': { schema: { type: 'object' } } } }
        }
      }
    },

    '/api/envelopes/status/bulk': {
      patch: {
        tags: ['Envelopes'],
        summary: 'Bulk update envelope status (updateMany)',
        parameters: dbParams,
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { type: 'object', required: ['oldStatus', 'newStatus'], properties: { oldStatus: { type: 'integer' }, newStatus: { type: 'integer' } } } }
          }
        },
        responses: {
          200: { description: 'OK', headers: dbUsedHeader, content: { 'application/json': { schema: { type: 'object' } } } }
        }
      }
    },

    '/api/envelopes/_meta/count': {
      get: {
        tags: ['Envelopes'],
        summary: 'Count envelopes',
        parameters: [...dbParams, { name: 'ES', in: 'query', schema: { type: 'integer' } }, { name: 'ORGId', in: 'query', schema: { type: 'string' } }],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'OK', headers: dbUsedHeader, content: { 'application/json': { schema: { type: 'object' } } } } }
      }
    },

    '/api/envelopes/_meta/distinct/{field}': {
      get: {
        tags: ['Envelopes'],
        summary: 'Distinct values for a field',
        parameters: [...dbParams, { name: 'field', in: 'path', required: true, schema: { type: 'string' } }],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'OK', headers: dbUsedHeader, content: { 'application/json': { schema: { type: 'object' } } } } }
      }
    },

    '/api/envelopes/_meta/exists/{EId}': {
      get: {
        tags: ['Envelopes'],
        summary: 'Check if envelope exists by EId',
        parameters: [...dbParams, { name: 'EId', in: 'path', required: true, schema: { type: 'string' } }],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'OK', headers: dbUsedHeader, content: { 'application/json': { schema: { type: 'object' } } } } }
      }
    },

    '/api/envelopes/_meta/aggregate': {
      post: {
        tags: ['Envelopes'],
        summary: 'Aggregate envelopes (Mongo full pipeline; MySQL supports $match/$sort/$limit)',
        parameters: dbParams,
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['pipeline'], properties: { pipeline: { type: 'array', items: { type: 'object' } } } } } }
        },
        responses: { 200: { description: 'OK', headers: dbUsedHeader, content: { 'application/json': { schema: { type: 'object' } } } } }
      }
    },

    '/api/migration/discover': {
      post: {
        tags: ['Migration'],
        summary: 'Schema Discovery - Discover MySQL/MSSQL database structure',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['host', 'port', 'username', 'database', 'dbType'],
                properties: {
                  host: { type: 'string', example: '127.0.0.1' },
                  port: { type: 'integer', example: 3306 },
                  username: { type: 'string', example: 'root' },
                  password: { type: 'string', example: '' },
                  database: { type: 'string', example: 'test_migration' },
                  dbType: { type: 'string', enum: ['mysql', 'mssql'], example: 'mysql' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Schema discovery successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    schema: { type: 'object' }
                  }
                }
              }
            }
          },
          400: { description: 'Invalid connection parameters' },
          500: { description: 'Connection failed' }
        }
      }
    },

    '/api/migration/migrate': {
      post: {
        tags: ['Migration'],
        summary: 'Execute Complete Migration - Migrate data from MySQL/MSSQL to MongoDB',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['host', 'port', 'username', 'database', 'dbType', 'mongoUri'],
                properties: {
                  host: { type: 'string', example: '127.0.0.1' },
                  port: { type: 'integer', example: 3306 },
                  username: { type: 'string', example: 'root' },
                  password: { type: 'string', example: '' },
                  database: { type: 'string', example: 'test_migration' },
                  dbType: { type: 'string', enum: ['mysql', 'mssql'], example: 'mysql' },
                  mongoUri: { type: 'string', example: 'mongodb+srv://user:pass@cluster.mongodb.net/dbname' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Migration completed successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    results: { type: 'object' },
                    report: { type: 'object' }
                  }
                }
              }
            }
          },
          400: { description: 'Invalid migration parameters' },
          500: { description: 'Migration failed' }
        }
      }
    },

    '/api/migration/status': {
      get: {
        tags: ['Migration'],
        summary: 'Get Migration Status - Retrieve current migration status and history',
        responses: {
          200: {
            description: 'Migration status retrieved',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    inProgress: { type: 'boolean' },
                    lastMigration: { type: 'object' },
                    lastReport: { type: 'object' }
                  }
                }
              }
            }
          }
        }
      }
    },

    '/api/migration/report': {
      get: {
        tags: ['Migration'],
        summary: 'Get Migration Report - Get detailed technical report of last migration',
        responses: {
          200: {
            description: 'Migration report retrieved',
            content: {
              'application/json': {
                schema: { type: 'object' }
              }
            }
          },
          404: { description: 'No migration report available' }
        }
      }
    },

    '/api/migration/test-connection': {
      post: {
        tags: ['Migration'],
        summary: 'Test Connection - Test MySQL/MSSQL connection parameters',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['host', 'port', 'username', 'database', 'dbType'],
                properties: {
                  host: { type: 'string', example: '127.0.0.1' },
                  port: { type: 'integer', example: 3306 },
                  username: { type: 'string', example: 'root' },
                  password: { type: 'string', example: '' },
                  database: { type: 'string', example: 'test_migration' },
                  dbType: { type: 'string', enum: ['mysql', 'mssql'], example: 'mysql' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Connection successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    connected: { type: 'boolean', example: true },
                    message: { type: 'string' }
                  }
                }
              }
            }
          },
          500: { description: 'Connection failed' }
        }
      }
    },

    '/api/migration/test-mongodb': {
      post: {
        tags: ['Migration'],
        summary: 'Test MongoDB Connection - Test MongoDB connection parameters',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['mongoUri'],
                properties: {
                  mongoUri: { type: 'string', example: 'mongodb+srv://user:pass@cluster.mongodb.net/dbname' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Connection successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    connected: { type: 'boolean', example: true },
                    message: { type: 'string' }
                  }
                }
              }
            }
          },
          500: { description: 'Connection failed' }
        }
      }
    }
  }
};


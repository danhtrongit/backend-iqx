import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { AnalysisReportsService } from '../services/analysis-reports.service';
import fastifyStatic from '@fastify/static';
import path from 'path';

// Request schemas
const getReportsBySymbolSchema = z.object({
  symbol: z.string().min(1).max(10).transform(s => s.toUpperCase()),
});

const getReportsBySymbolQuerySchema = z.object({
  page: z.union([z.string(), z.number()]).optional().default('0').transform(val => Number(val)),
  size: z.union([z.string(), z.number()]).optional().default('20').transform(val => Number(val)),
});

const getAllReportsQuerySchema = z.object({
  page: z.union([z.string(), z.number()]).optional().default('0').transform(val => Number(val)),
  size: z.union([z.string(), z.number()]).optional().default('20').transform(val => Number(val)),
  source: z.string().optional(),
  reportType: z.union([z.string(), z.number()]).optional().transform(val => val ? Number(val) : undefined),
  recommend: z.string().optional(),
});

const syncReportsSchema = z.object({
  symbol: z.string().min(1).max(10).transform(s => s.toUpperCase()),
  downloadPDFs: z.boolean().optional().default(true),
});

const getReportByIdSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(val => Number(val)),
});

const analysisReportsRoutes: FastifyPluginAsync = async (fastify, opts) => {
  // Serve static PDF files - must be registered first to take precedence
  await fastify.register(fastifyStatic, {
    root: path.join(process.cwd(), 'public', 'analysis-reports'),
    prefix: '/pdfs/', // This will be under /api/analysis-reports/pdfs/
    decorateReply: false,
  });

  // Get reports by symbol with pagination
  fastify.get('/:symbol', {
    schema: {
      description: 'Get analysis reports for a specific stock symbol',
      params: {
        type: 'object',
        properties: {
          symbol: { type: 'string', minLength: 1, maxLength: 10 },
        },
        required: ['symbol'],
      },
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 0, default: 0 },
          size: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  ticker: { type: 'string' },
                  tickerName: { type: ['string', 'null'] },
                  reportType: { type: 'integer' },
                  source: { type: 'string' },
                  issueDate: { type: 'string' },
                  issueDateTimeAgo: { type: ['string', 'null'] },
                  title: { type: 'string' },
                  attachedLink: { type: 'string' },
                  localPdfPath: { type: ['string', 'null'] },
                  fileName: { type: ['string', 'null'] },
                  targetPrice: { type: ['string', 'null'] },
                  recommend: { type: ['string', 'null'] },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                },
              },
            },
            total: { type: 'integer' },
            page: { type: 'integer' },
            size: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const params = getReportsBySymbolSchema.parse(request.params);
      const query = getReportsBySymbolQuerySchema.parse(request.query);
      
      const result = await AnalysisReportsService.getReportsBySymbol(
        params.symbol,
        query.page,
        query.size
      );
      
      // Transform localPdfPath to include the API base URL if it exists
      const transformedData = result.data.map(report => ({
        ...report,
        localPdfPath: report.localPdfPath 
          ? `${request.protocol}://${request.hostname}/api/analysis-reports/pdfs/${report.localPdfPath.replace('/analysis-reports/', '')}`
          : null,
      }));
      
      return reply.code(200).send({
        ...result,
        data: transformedData,
      });
    } catch (error) {
      fastify.log.error(error);
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ 
          error: 'Validation error', 
          details: error.errors 
        });
      }
      return reply.code(500).send({ 
        error: 'Failed to fetch analysis reports' 
      });
    }
  });

  // Get all reports with optional filtering
  fastify.get('/', {
    schema: {
      description: 'Get all analysis reports with optional filtering',
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 0, default: 0 },
          size: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          source: { type: 'string' },
          reportType: { type: 'integer' },
          recommend: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  ticker: { type: 'string' },
                  tickerName: { type: ['string', 'null'] },
                  reportType: { type: 'integer' },
                  source: { type: 'string' },
                  issueDate: { type: 'string' },
                  issueDateTimeAgo: { type: ['string', 'null'] },
                  title: { type: 'string' },
                  attachedLink: { type: 'string' },
                  localPdfPath: { type: ['string', 'null'] },
                  fileName: { type: ['string', 'null'] },
                  targetPrice: { type: ['string', 'null'] },
                  recommend: { type: ['string', 'null'] },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                },
              },
            },
            total: { type: 'integer' },
            page: { type: 'integer' },
            size: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const query = getAllReportsQuerySchema.parse(request.query);
      
      const result = await AnalysisReportsService.getAllReports(
        query.page,
        query.size,
        {
          source: query.source,
          reportType: query.reportType,
          recommend: query.recommend,
        }
      );
      
      // Transform localPdfPath to include the API base URL if it exists
      const transformedData = result.data.map(report => ({
        ...report,
        localPdfPath: report.localPdfPath 
          ? `${request.protocol}://${request.hostname}/api/analysis-reports/pdfs/${report.localPdfPath.replace('/analysis-reports/', '')}`
          : null,
      }));
      
      return reply.code(200).send({
        ...result,
        data: transformedData,
      });
    } catch (error) {
      fastify.log.error(error);
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ 
          error: 'Validation error', 
          details: error.errors 
        });
      }
      return reply.code(500).send({ 
        error: 'Failed to fetch analysis reports' 
      });
    }
  });

  // Get a single report by ID
  fastify.get('/report/:id', {
    schema: {
      description: 'Get a single analysis report by ID',
      params: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
        },
        required: ['id'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            ticker: { type: 'string' },
            tickerName: { type: ['string', 'null'] },
            reportType: { type: 'integer' },
            source: { type: 'string' },
            issueDate: { type: 'string' },
            issueDateTimeAgo: { type: ['string', 'null'] },
            title: { type: 'string' },
            attachedLink: { type: 'string' },
            localPdfPath: { type: ['string', 'null'] },
            fileName: { type: ['string', 'null'] },
            targetPrice: { type: ['string', 'null'] },
            recommend: { type: ['string', 'null'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const params = getReportByIdSchema.parse(request.params);
      
      const report = await AnalysisReportsService.getReportById(params.id);
      
      if (!report) {
        return reply.code(404).send({ 
          error: 'Report not found' 
        });
      }
      
      // Transform localPdfPath to include the API base URL if it exists
      const transformedReport = {
        ...report,
        localPdfPath: report.localPdfPath 
          ? `${request.protocol}://${request.hostname}/api/analysis-reports/pdfs/${report.localPdfPath.replace('/analysis-reports/', '')}`
          : null,
      };
      
      return reply.code(200).send(transformedReport);
    } catch (error) {
      fastify.log.error(error);
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ 
          error: 'Validation error', 
          details: error.errors 
        });
      }
      return reply.code(500).send({ 
        error: 'Failed to fetch report' 
      });
    }
  });

  // Sync reports from Simplize API (admin endpoint)
  fastify.post('/sync', {
    preHandler: fastify.authenticate,
    schema: {
      description: 'Sync analysis reports from Simplize API for a specific symbol',
      body: {
        type: 'object',
        properties: {
          symbol: { type: 'string', minLength: 1, maxLength: 10 },
          downloadPDFs: { type: 'boolean', default: true },
        },
        required: ['symbol'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            saved: { type: 'integer' },
            errors: { type: 'integer' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const body = syncReportsSchema.parse(request.body);
      
      const result = await AnalysisReportsService.fetchAndSaveReports(
        body.symbol,
        body.downloadPDFs
      );
      
      return reply.code(200).send({
        message: `Sync completed for ${body.symbol}`,
        saved: result.saved,
        errors: result.errors,
      });
    } catch (error) {
      fastify.log.error(error);
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ 
          error: 'Validation error', 
          details: error.errors 
        });
      }
      return reply.code(500).send({ 
        error: 'Failed to sync analysis reports' 
      });
    }
  });

  // Clean up old reports (admin endpoint)
  fastify.delete('/cleanup', {
    preHandler: fastify.authenticate,
    schema: {
      description: 'Delete analysis reports older than specified days',
      querystring: {
        type: 'object',
        properties: {
          daysToKeep: { type: 'integer', minimum: 30, default: 365 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            deletedCount: { type: 'integer' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { daysToKeep = 365 } = request.query as { daysToKeep?: number };
      
      const deletedCount = await AnalysisReportsService.deleteOldReports(daysToKeep);
      
      return reply.code(200).send({
        message: `Deleted reports older than ${daysToKeep} days`,
        deletedCount,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ 
        error: 'Failed to clean up old reports' 
      });
    }
  });
};

export default analysisReportsRoutes;
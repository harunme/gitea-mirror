import type { APIRoute } from "astro";
import { db, configs, users } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";
import { calculateCleanupInterval } from "@/lib/cleanup-service";
import { createSecureErrorResponse } from "@/lib/utils";
import { 
  mapUiToDbConfig, 
  mapDbToUiConfig, 
  mapUiScheduleToDb, 
  mapUiCleanupToDb,
  mapDbScheduleToUi,
  mapDbCleanupToUi 
} from "@/lib/utils/config-mapper";
import { encrypt, decrypt, migrateToken } from "@/lib/utils/encryption";

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { userId, githubConfig, giteaConfig, scheduleConfig, cleanupConfig, mirrorOptions, advancedOptions } = body;

    if (!userId || !githubConfig || !giteaConfig || !scheduleConfig || !cleanupConfig || !mirrorOptions || !advancedOptions) {
      return new Response(
        JSON.stringify({
          success: false,
          message:
            "userId, githubConfig, giteaConfig, scheduleConfig, cleanupConfig, mirrorOptions, and advancedOptions are required.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Fetch existing config
    const existingConfigResult = await db
      .select()
      .from(configs)
      .where(eq(configs.userId, userId))
      .limit(1);

    const existingConfig = existingConfigResult[0];

    // Map UI structure to database schema structure first
    const { githubConfig: mappedGithubConfig, giteaConfig: mappedGiteaConfig } = mapUiToDbConfig(
      githubConfig,
      giteaConfig,
      mirrorOptions,
      advancedOptions
    );
    
    // Preserve tokens if fields are empty
    if (existingConfig) {
      try {
        const existingGithub =
          typeof existingConfig.githubConfig === "string"
            ? JSON.parse(existingConfig.githubConfig)
            : existingConfig.githubConfig;

        const existingGitea =
          typeof existingConfig.giteaConfig === "string"
            ? JSON.parse(existingConfig.giteaConfig)
            : existingConfig.giteaConfig;

        // Decrypt existing tokens before preserving
        if (!mappedGithubConfig.token && existingGithub.token) {
          mappedGithubConfig.token = decrypt(existingGithub.token);
        }

        if (!mappedGiteaConfig.token && existingGitea.token) {
          mappedGiteaConfig.token = decrypt(existingGitea.token);
        }
      } catch (tokenError) {
        console.error("Failed to preserve tokens:", tokenError);
      }
    }
    
    // Encrypt tokens before saving
    if (mappedGithubConfig.token) {
      mappedGithubConfig.token = encrypt(mappedGithubConfig.token);
    }
    
    if (mappedGiteaConfig.token) {
      mappedGiteaConfig.token = encrypt(mappedGiteaConfig.token);
    }

    // Map schedule and cleanup configs to database schema
    const processedScheduleConfig = mapUiScheduleToDb(scheduleConfig);
    const processedCleanupConfig = mapUiCleanupToDb(cleanupConfig);

    if (existingConfig) {
      // Update path
      await db
        .update(configs)
        .set({
          githubConfig: mappedGithubConfig,
          giteaConfig: mappedGiteaConfig,
          scheduleConfig: processedScheduleConfig,
          cleanupConfig: processedCleanupConfig,
          updatedAt: new Date(),
        })
        .where(eq(configs.id, existingConfig.id));

      return new Response(
        JSON.stringify({
          success: true,
          message: "Configuration updated successfully",
          configId: existingConfig.id,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Fallback user check (optional if you're always passing userId)
    const userExists = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userExists.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Invalid userId. No matching user found.",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Create new config
    const configId = uuidv4();
    await db.insert(configs).values({
      id: configId,
      userId,
      name: "Default Configuration",
      isActive: true,
      githubConfig: mappedGithubConfig,
      giteaConfig: mappedGiteaConfig,
      include: [],
      exclude: [],
      scheduleConfig: processedScheduleConfig,
      cleanupConfig: processedCleanupConfig,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Configuration created successfully",
        configId,
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return createSecureErrorResponse(error, "config save", 500);
  }
};

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return new Response(JSON.stringify({ error: "User ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fetch the configuration for the user
    const config = await db
      .select()
      .from(configs)
      .where(eq(configs.userId, userId))
      .limit(1);

    if (config.length === 0) {
      // Return a default empty configuration with database structure
      const defaultDbConfig = {
        githubConfig: {
          owner: "",
          type: "personal",
          token: "",
          includeStarred: false,
          includeForks: true,
          includeArchived: false,
          includePrivate: false,
          includePublic: true,
          includeOrganizations: [],
          starredReposOrg: "starred",
          mirrorStrategy: "preserve",
          defaultOrg: "github-mirrors",
        },
        giteaConfig: {
          url: "",
          token: "",
          defaultOwner: "",
          mirrorInterval: "8h",
          lfs: false,
          wiki: false,
          visibility: "public",
          createOrg: true,
          addTopics: true,
          preserveVisibility: false,
          forkStrategy: "reference",
        },
      };
      
      const uiConfig = mapDbToUiConfig(defaultDbConfig);
      
      return new Response(
        JSON.stringify({
          id: null,
          userId: userId,
          name: "Default Configuration",
          isActive: true,
          ...uiConfig,
          scheduleConfig: {
            enabled: true,
            interval: 86400, // 24 hours (1 day) in seconds
            lastRun: null,
            nextRun: null,
          },
          cleanupConfig: {
            enabled: true,
            retentionDays: 604800, // 7 days in seconds
            lastRun: null,
            nextRun: null,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Map database structure to UI structure
    const dbConfig = config[0];
    
    // Decrypt tokens before sending to UI
    try {
      const githubConfig = typeof dbConfig.githubConfig === "string"
        ? JSON.parse(dbConfig.githubConfig)
        : dbConfig.githubConfig;
      
      const giteaConfig = typeof dbConfig.giteaConfig === "string"
        ? JSON.parse(dbConfig.giteaConfig)
        : dbConfig.giteaConfig;
      
      // Decrypt tokens
      if (githubConfig.token) {
        githubConfig.token = decrypt(githubConfig.token);
      }
      
      if (giteaConfig.token) {
        giteaConfig.token = decrypt(giteaConfig.token);
      }
      
      // Create modified config with decrypted tokens
      const decryptedConfig = {
        ...dbConfig,
        githubConfig,
        giteaConfig
      };
      
      const uiConfig = mapDbToUiConfig(decryptedConfig);
      
      // Map schedule and cleanup configs to UI format
      const uiScheduleConfig = mapDbScheduleToUi(dbConfig.scheduleConfig);
      const uiCleanupConfig = mapDbCleanupToUi(dbConfig.cleanupConfig);
      
      return new Response(JSON.stringify({
        ...dbConfig,
        ...uiConfig,
        scheduleConfig: {
          ...uiScheduleConfig,
          lastRun: dbConfig.scheduleConfig.lastRun,
          nextRun: dbConfig.scheduleConfig.nextRun,
        },
        cleanupConfig: {
          ...uiCleanupConfig,
          lastRun: dbConfig.cleanupConfig.lastRun,
          nextRun: dbConfig.cleanupConfig.nextRun,
        },
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Failed to decrypt tokens:", error);
      // Return config without decrypting tokens if there's an error
      const uiConfig = mapDbToUiConfig(dbConfig);
      const uiScheduleConfig = mapDbScheduleToUi(dbConfig.scheduleConfig);
      const uiCleanupConfig = mapDbCleanupToUi(dbConfig.cleanupConfig);
      
      return new Response(JSON.stringify({
        ...dbConfig,
        ...uiConfig,
        scheduleConfig: {
          ...uiScheduleConfig,
          lastRun: dbConfig.scheduleConfig.lastRun,
          nextRun: dbConfig.scheduleConfig.nextRun,
        },
        cleanupConfig: {
          ...uiCleanupConfig,
          lastRun: dbConfig.cleanupConfig.lastRun,
          nextRun: dbConfig.cleanupConfig.nextRun,
        },
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    return createSecureErrorResponse(error, "config fetch", 500);
  }
};

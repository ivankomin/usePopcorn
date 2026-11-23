import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '../../types/database.types.ts';

export interface SystemLockOptions {
  dryRun?: boolean;
  updatingMessage: string;
  successMessage: string;
  errorMessage: string;
  interruptLabel: string;
}

const SYSTEM_STATE_ID = 'sync_status';
type SystemStatus = 'Free' | 'Updating';
type SeedLogLevel = 'info' | 'warn' | 'error' | 'critical';
type SeedLogCategory = 'system' | 'auth' | 'admin' | 'db' | 'sync';

export async function writeSeedLog(
  supabase: SupabaseClient<Database>,
  entry: {
    level: SeedLogLevel;
    category: SeedLogCategory;
    action: string;
    message: string;
    metadata?: Record<string, Json | undefined>;
    dryRun?: boolean;
  }
): Promise<void> {
  if (entry.dryRun) return;
  try {
    const { error } = await supabase.from('system_logs').insert({
      level: entry.level,
      category: entry.category,
      action: entry.action,
      message: entry.message,
      actor_id: null,
      metadata: (entry.metadata ?? {}) as Json,
    });
    if (error) {
      console.warn(`[SeedLogger] Failed writing system_logs: ${error.message}`);
    }
  } catch (err) {
    console.warn('[SeedLogger] Unexpected error writing system_logs:', err);
  }
}

async function setSystemState(
  supabase: SupabaseClient<Database>,
  status: SystemStatus,
  message: string
): Promise<void> {
  const { error } = await supabase.from('system_state').upsert(
    {
      id: SYSTEM_STATE_ID,
      status,
      message,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  if (error) {
    throw new Error(
      `Failed updating system_state to "${status}": ${error.message}`
    );
  }
}

export async function withSystemStateLock(
  supabase: SupabaseClient<Database>,
  options: SystemLockOptions,
  task: () => Promise<void>
): Promise<void> {
  if (options.dryRun) {
    console.log('[DRY RUN] Skipping system_state lock update.');
    await task();
    return;
  }

  let lockAcquired = false;
  let lockReleased = false;

  const releaseLock = async (message: string): Promise<void> => {
    if (!lockAcquired || lockReleased) return;
    lockReleased = true;

    try {
      await setSystemState(supabase, 'Free', message);
      console.log('System status restored to "Free" (manual ingestion unlocked).');
    } catch (unlockErr) {
      console.error('Failed to restore system_state to "Free":', unlockErr);
    }
  };

  const handleSigInt = () => {
    console.warn('\nReceived SIGINT. Releasing system lock before exiting...');
    void releaseLock(
      `System operational. Unlocked after ${options.interruptLabel} interrupted (SIGINT).`
    ).finally(() => {
      process.exit(130);
    });
  };

  const handleSigTerm = () => {
    console.warn('\nReceived SIGTERM. Releasing system lock before exiting...');
    void releaseLock(
      `System operational. Unlocked after ${options.interruptLabel} interrupted (SIGTERM).`
    ).finally(() => {
      process.exit(143);
    });
  };

  process.on('SIGINT', handleSigInt);
  process.on('SIGTERM', handleSigTerm);

  await setSystemState(supabase, 'Updating', options.updatingMessage);
  lockAcquired = true;
  console.log('System status set to "Updating" (manual ingestion locked).');
  await writeSeedLog(supabase, {
    level: 'info',
    category: 'system',
    action: 'system.lock_acquired',
    message: options.updatingMessage,
    metadata: { source: options.interruptLabel },
  });

  let succeeded = false;
  try {
    await task();
    succeeded = true;
  } catch (err) {
    await writeSeedLog(supabase, {
      level: 'error',
      category: 'sync',
      action: 'sync.task_failed',
      message: `Error during ${options.interruptLabel}: ${
        err instanceof Error ? err.message : String(err)
      }`,
      metadata: { source: options.interruptLabel },
    });
    throw err;
  } finally {
    process.off('SIGINT', handleSigInt);
    process.off('SIGTERM', handleSigTerm);
    const releaseMsg = succeeded ? options.successMessage : options.errorMessage;
    await releaseLock(releaseMsg);
    await writeSeedLog(supabase, {
      level: succeeded ? 'info' : 'warn',
      category: 'system',
      action: 'system.lock_released',
      message: releaseMsg,
      metadata: { source: options.interruptLabel, succeeded },
    });
  }
}

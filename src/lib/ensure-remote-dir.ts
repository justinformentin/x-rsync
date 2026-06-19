import type SFTPClient from 'ssh2-sftp-client';

export async function ensureRemoteDir(sftp: SFTPClient, remotePath: string) {
  const segments = remotePath.split('/').filter(Boolean);
  let current = '';
  for (const seg of segments) {
    current += `/${seg}`;
    try {
      // mkdir with 'true' to ignore if exists in some implementations
      await sftp.mkdir(current, true);
    } catch {
      // Many SFTP servers throw generic errors even if the dir exists.
      // We can safely ignore errors here.
    }
  }
}

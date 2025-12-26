import AdminShell from "../AdminShell";

export default async function Backups() {
  return (
    <AdminShell title="Backups">
      <div style={{display:"grid",gap:12}}>
        <h1 style={{margin:0}}>Backups</h1>
        <div style={{color:"#666"}}>
          Backups run automatically in Docker using the <b>backup</b> service. This page shows safe commands to manage them.
        </div>

        <div style={{border:"1px solid #eee",borderRadius:14,padding:12}}>
          <div style={{fontWeight:900}}>Create a manual backup</div>
          <pre style={{whiteSpace:"pre-wrap"}}>{`docker compose -f docker-compose.prod.yml exec backup /app/backup.sh`}</pre>
        </div>

        <div style={{border:"1px solid #eee",borderRadius:14,padding:12}}>
          <div style={{fontWeight:900}}>List backups</div>
          <pre style={{whiteSpace:"pre-wrap"}}>{`docker compose -f docker-compose.prod.yml exec backup ls -lh /backups`}</pre>
        </div>

        <div style={{border:"1px solid #eee",borderRadius:14,padding:12}}>
          <div style={{fontWeight:900}}>Restore a backup (dangerous)</div>
          <div style={{color:"#a00", marginTop:6}}>Restore overwrites your database. Only do this if you understand the risk.</div>
          <pre style={{whiteSpace:"pre-wrap"}}>{`docker compose -f docker-compose.prod.yml exec api bash -lc "DATABASE_URL=\$DATABASE_URL /app/scripts/restore.sh /backups/backup-YYYYMMDD-HHMMSS.sql.gz"`}</pre>
        </div>
      </div>
    </AdminShell>
  );
}

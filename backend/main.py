from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from cassandra_client import connect, get_session, get_cluster

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    connect()

@app.get("/")
def root():
    return {"status": "SimCassandra backend running"}

@app.get("/cluster/nodes")
def get_nodes():
    from cassandra_client import get_nodes_info
    nodes = get_nodes_info()
    return {"nodes": nodes}

@app.get("/cluster/tokens")
def get_tokens():
    """Retourne les token ranges réels de chaque nœud du cluster."""
    cluster = get_cluster()
    session = get_session()
    result = []
    for host in cluster.metadata.all_hosts():
        tokens = [
            str(t.value)
            for t in sorted(cluster.metadata.token_map.token_to_host_owner.keys())
            if cluster.metadata.token_map.token_to_host_owner[t] == host
        ]
        result.append({
            "address": str(host.address),
            "datacenter": host.datacenter,
            "rack": host.rack,
            "is_up": True, # Fix for driver routing issue
            "tokens": tokens
        })
    return {"nodes": result}

@app.get("/data/all")
def get_all_users():
    """Retourne tous les utilisateurs insérés dans Cassandra avec leur token."""
    session = get_session()
    rows = session.execute(
        "SELECT token(user_id), user_id, name, email FROM users"
    )
    users = []
    for row in rows:
        users.append({
            "token": str(row[0]),
            "user_id": row.user_id,
            "name": row.name,
            "email": row.email
        })
    return {"users": users}

@app.post("/data/insert")
def insert_user(user_id: str, name: str, email: str):
    session = get_session()
    session.execute(
        "INSERT INTO users (user_id, name, email) VALUES (%s, %s, %s)",
        (user_id, name, email)
    )
    row = session.execute(
        "SELECT token(user_id) FROM users WHERE user_id = %s",
        (user_id,)
    ).one()
    token = row[0]
    return {
        "user_id": user_id,
        "token": token,
        "message": "Inséré avec succès"
    }

@app.get("/data/partition/{user_id}")
def get_partition_info(user_id: str):
    session = get_session()
    row = session.execute(
        "SELECT token(user_id), user_id, name, email FROM users WHERE user_id = %s",
        (user_id,)
    ).one()
    if not row:
        return {"error": "Utilisateur non trouvé"}
    return {
        "user_id": row.user_id,
        "name": row.name,
        "email": row.email,
        "token": row[0]
    }
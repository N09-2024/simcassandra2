from cassandra.cluster import Cluster
from cassandra.policies import RoundRobinPolicy

cluster = None
session = None

def connect():
    global cluster, session
    cluster = Cluster(
        contact_points=["127.0.0.1"],
        port=9042,
        load_balancing_policy=RoundRobinPolicy(),
        protocol_version=4
    )
    session = cluster.connect()
    setup_keyspace()
    print("Connecté à Cassandra !")

def setup_keyspace():
    session.execute("""
        CREATE KEYSPACE IF NOT EXISTS simcassandra
        WITH replication = {
            'class': 'SimpleStrategy',
            'replication_factor': 3
        }
    """)
    session.set_keyspace("simcassandra")
    session.execute("""
        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            name TEXT,
            email TEXT
        )
    """)

def get_nodes_info():
    nodes = []
    for host in cluster.metadata.all_hosts():
        nodes.append({
            "address": str(host.address),
            "datacenter": host.datacenter,
            "rack": host.rack,
            "is_up": True # Forcé à True car le driver Python (sur l'hôte) ne peut pas joindre les IPs internes Docker (172.x)
        })
    return nodes

def get_session():
    return session

def get_cluster():
    return cluster
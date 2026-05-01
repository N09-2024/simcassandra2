# 🍩 SimCassandra - Simulateur Visuel Apache Cassandra

SimCassandra est un outil éducatif et interactif conçu pour comprendre le fonctionnement interne d'**Apache Cassandra**. Il combine un **véritable cluster Cassandra (via Docker)** avec une **interface web visuelle et pédagogique** pour observer en temps réel comment les données sont distribuées, répliquées et gérées en cas de panne.

---

## 🏗️ Architecture du projet

Le projet est divisé en 3 couches principales :

1. **Le Cluster (Docker)** : `docker-compose.yml` déploie 3 véritables nœuds Cassandra en réseau local.
2. **Le Backend (Python / FastAPI)** : Sert de pont entre l'interface visuelle et la base de données. Il utilise le driver officiel `cassandra-driver`.
3. **Le Frontend (React / Vite)** : Une interface "Premium" épurée qui écoute le backend et dessine de façon dynamique l'anneau de hachage, les chemins de réplication et simule les pannes.

---

## 🛠️ Prérequis

Pour lancer ce projet sur votre machine, vous devez installer :
- **Docker Desktop** (pour faire tourner les nœuds Cassandra)
- **Python 3.10+** (pour l'API)
- **Node.js & npm** (pour l'interface React)

---

## 🚀 Installation et Lancement (Étape par Étape)

### Étape 1 : Démarrer le Cluster Cassandra
Ouvrez un terminal à la racine du projet et lancez Docker :
```bash
docker compose up -d
```
*(Attention : Cassandra prend quelques minutes à démarrer et à se synchroniser. Vous pouvez vérifier l'état avec `docker compose ps`)*.

### Étape 2 : Lancer le Backend (API FastAPI)
Ouvrez un **deuxième terminal**, placez-vous dans le dossier `backend` :
```bash
cd backend
# (Optionnel) Créer un environnement virtuel : python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```
L'API tournera sur `http://127.0.0.1:8000`. Elle s'occupera de créer le *Keyspace* et la table *Users* automatiquement.

### Étape 3 : Lancer le Frontend (Interface React)
Ouvrez un **troisième terminal**, placez-vous dans le dossier `frontend` :
```bash
cd frontend
npm install
npm run dev
```
L'application web s'ouvrira sur `http://localhost:5174` (ou le port indiqué dans le terminal).

---

## 📖 Guide de l'Interface Utilisateur

Une fois sur l'application web, vous pouvez insérer des données via la barre latérale. Le tableau de bord est divisé en 4 concepts clés :

1. **Partitionnement Global** : Visualisation logique du Load Balancing. Vous verrez l'anneau divisé en 3 parts égales (les nœuds) et comment les données (hashées via Murmur3) se distribuent naturellement sur l'anneau.
2. **Token Ring** : Visualisation de l'anneau de hachage et mise en évidence du **Nœud Primaire** responsable pour une donnée spécifique sélectionnée.
3. **Écriture & Réplication** : Visualisation du Facteur de Réplication (RF=3). Montre comment une donnée insérée sur le nœud primaire est ensuite copiée sur les nœuds suivants dans l'anneau pour assurer la redondance.
4. **Pannes & Quorum** : Un simulateur interactif pour désactiver virtuellement un ou plusieurs nœuds. Il permet de comprendre la notion de **Niveau de Consistance (Consistency Level)** et de vérifier si le cluster peut encore répondre aux requêtes (Quorum) malgré les pannes.

---

## 🤝 Contribution (Pour le groupe)
Si vous souhaitez modifier le code :
- Le design principal se trouve dans `frontend/src/index.css` et `frontend/src/App.jsx`.
- Les graphiques circulaires (SVG) utilisent la librairie `d3.js` et sont gérés dans `Partitionnement.jsx` et `TokenRing.jsx`.
- La logique de connexion à la base de données est dans `backend/cassandra_client.py`.

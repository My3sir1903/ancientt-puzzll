import os
from pymongo import MongoClient

# .env dosyasından bağlantı bilgilerini okuyoruz
mongo_url = "mongodb://localhost:27017"
db_name = "test_db"

env_path = "/app/backend/.env"
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            if line.startswith("MONGO_URL="):
                mongo_url = line.split("=", 1)[1].strip().strip('"')
            elif line.startswith("DB_NAME="):
                db_name = line.split("=", 1)[1].strip().strip('"')

print(f"Bağlanılan DB: {db_name}")

try:
    client = MongoClient(mongo_url)
    db = client[db_name]

    # Bütün scores koleksiyonunu sıfırlar:
    res = db.scores.delete_many({})
    print(f"Toplam silinen kayıt: {res.deleted_count}")

    client.close()
except Exception as e:
    print(f"Hata oluştu: {e}")
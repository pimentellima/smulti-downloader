import os
import yt_dlp 
import psycopg2
from psycopg2.extras import DictCursor
import json

ydl_opts = {
    'cookiefile': 'cookies.txt', 
    'cachedir': False  
}
def extract_job_info(video_url):
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(video_url, download=False)

    formats_mp4 = []
    formats_mp3 = []

    for f in info.get("formats", []):
        ext = f.get("ext")
        vcodec = f.get("vcodec")
        acodec = f.get("acodec")

        base_format = {
            "url": f.get("url"),
            "ext": ext,
            "filesize": f.get("filesize"),
            "format_id": f.get("format_id"),
        }

        if vcodec != "none":
            formats_mp4.append({
                **base_format,
                "resolution": f"{f.get('width')}x{f.get('height')}" if f.get("width") and f.get("height") else "unknown"
            })
        elif acodec != "none":
            formats_mp3.append(base_format)

    return {
        "title": info.get("title"),
        "url": video_url,
        "json": {
            "title": info.get("title"),
            "formats_mp4": formats_mp4,
            "formats_mp3": formats_mp3,
            "thumbnail_url": info.get("thumbnail")
        }
    }

def insert_job(conn, job_id):
    with conn.cursor(cursor_factory=DictCursor) as cur:
        cur.execute("SELECT * FROM jobs WHERE id = %s", (job_id,))
        job = cur.fetchone()
        
        if not job:
            print(f"Job ID {job_id} não encontrado no banco de dados")
            return
                
        video_url = job["url"]
        job_data = extract_job_info(video_url)
        cur.execute(
            "UPDATE jobs SET json = %s, status = %s, title = %s WHERE id = %s",
            (json.dumps(job_data["json"]), 'ready', job_data["title"], job_id)
        )
            
    conn.commit()
    print("Job inserido com sucesso.")
def lambda_handler(event, context=None):
    db_connection_string = os.environ.get('DATABASE_URL')
    
    for record in event["Records"]:
        job_id = record["body"]
        print("Mensagem recebida:", job_id)
        
        conn = None
        try:
            conn = psycopg2.connect(db_connection_string)
            insert_job(conn, job_id)
            
        except Exception as e:
            print("Erro ao processar job:", e)
            try:
                if conn is not None and not conn.closed:
                    cur = conn.cursor()
                    
                    cur.execute(
                        "UPDATE jobs SET status = %s WHERE id = %s",
                        ('error', job_id)
                    )
                    
                    conn.commit()
                    
                    print(f"Job atualizado com status de erro. ID: {job_id}")
            except Exception as err:
                print("Erro ao registrar falha no banco:", err)
        finally:
            if conn is not None and not conn.closed:
                conn.close()

    return {"statusCode": 200}
    return {"statusCode": 200}

# import uuid
# from sqlalchemy.orm import sessionmaker
# from werkzeug.utils import secure_filename

# from celery_app import celery          # ✅ NOT from app
# from extensionsrun import db, supabase
# from task_histr import TaskAttemptHistory


# @celery.task(
#     bind=True,
#     autoretry_for=(Exception,),
#     retry_kwargs={"max_retries": 3, "countdown": 5},
#     retry_backoff=True
# )
# def upload_files_to_supabase_task(self, attempt_id, files_meta):

#     Session = sessionmaker(bind=db.engine)
#     session = Session()

#     try:
#         uploaded_files = []

#         for f in files_meta:
#             original_name = secure_filename(f["filename"])
#             ext = original_name.rsplit(".", 1)[-1].lower()
#             file_uuid = str(uuid.uuid4())

#             storage_name = f"subquests/{attempt_id}/{file_uuid}.{ext}"

#             supabase.storage.from_("uploads").upload(
#                 storage_name,
#                 f["content"],
#                 {
#                     "content-type": f["mimetype"],
#                     "cache-control": "3600"
#                 }
#             )

#             public_url = supabase.storage.from_("uploads").get_public_url(storage_name)

#             uploaded_files.append({
#                 "name": original_name,
#                 "url": public_url
#             })

#         attempt = session.get(TaskAttemptHistory, attempt_id)
#         if attempt:
#             data = attempt.user_input or {}
#             data["files"] = uploaded_files
#             attempt.user_input = data
#             session.commit()

#         return {"success": True, "files": uploaded_files}

#     except Exception:
#         session.rollback()
#         raise
#     finally:
#         session.close()

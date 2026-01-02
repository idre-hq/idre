-- Drop old foreign keys and add new ones with CASCADE
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_notebook_id_fkey;
ALTER TABLE tasks ADD CONSTRAINT tasks_notebook_id_fkey 
    FOREIGN KEY (notebook_id) REFERENCES notebooks(id) ON DELETE CASCADE;

ALTER TABLE folders DROP CONSTRAINT IF EXISTS folders_notebook_id_fkey;
ALTER TABLE folders ADD CONSTRAINT folders_notebook_id_fkey 
    FOREIGN KEY (notebook_id) REFERENCES notebooks(id) ON DELETE CASCADE;

ALTER TABLE files DROP CONSTRAINT IF EXISTS files_notebook_id_fkey;
ALTER TABLE files ADD CONSTRAINT files_notebook_id_fkey 
    FOREIGN KEY (notebook_id) REFERENCES notebooks(id) ON DELETE CASCADE;

ALTER TABLE whiteboards DROP CONSTRAINT IF EXISTS whiteboards_notebook_id_fkey;
ALTER TABLE whiteboards ADD CONSTRAINT whiteboards_notebook_id_fkey 
    FOREIGN KEY (notebook_id) REFERENCES notebooks(id) ON DELETE CASCADE;

ALTER TABLE chat DROP CONSTRAINT IF EXISTS chat_notebook_id_fkey;
ALTER TABLE chat ADD CONSTRAINT chat_notebook_id_fkey 
    FOREIGN KEY (notebook_id) REFERENCES notebooks(id) ON DELETE CASCADE;

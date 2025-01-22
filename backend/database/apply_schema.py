import os
import logging
from sqlalchemy import text
from database import engine

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def apply_schema():
    """Apply the database schema"""
    try:
        # Read the schema file
        schema_path = os.path.join(os.path.dirname(__file__), 'schema.sql')
        with open(schema_path, 'r') as f:
            schema = f.read()

        # Split into individual statements
        statements = schema.split(';')

        # Execute each statement
        with engine.connect() as conn:
            for statement in statements:
                if statement.strip():
                    try:
                        conn.execute(text(statement))
                        conn.commit()
                    except Exception as e:
                        logger.error(f"Error executing statement: {e}")
                        logger.error(f"Statement: {statement}")
                        raise

        logger.info("Schema applied successfully!")
        return True
    except Exception as e:
        logger.error(f"Failed to apply schema: {e}")
        return False

if __name__ == "__main__":
    apply_schema()

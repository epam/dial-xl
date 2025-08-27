# Migrate Projects CLI

A command-line tool for migrating QG projects using predefined migration functions.

## Overview

This CLI tool helps with migrating QG projects by applying specific migration functions. It provides options for:

- Creating backups before migration
- Running test migrations (saving changes only locally)
- Performing real migrations on user files

## Usage

To use the Migrate Projects CLI, you can run the following command:

```bash
npm run migrate -- -r aws_region -b bucket_name -k s3_bucket_key_id -s s3_bucket_secret_access_key
```

where:

- `aws_region`: The AWS region where the S3 bucket is located.
- `bucket_name`: The name of the S3 bucket where the project files are stored.
- `s3_bucket_key_id`: The AWS S3 bucket key ID for authentication.
- `s3_bucket_secret_access_key`: The AWS S3 bucket secret access key for authentication.

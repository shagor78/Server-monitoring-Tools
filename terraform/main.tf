terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

variable "aws_region" {
  type    = string
  default = "ap-southeast-1"
}

provider "aws" {
  region = var.aws_region
}

resource "aws_vpc" "aegis_noc_vpc" {
  cidr_block           = "10.24.0.0/16"
  enable_dns_hostnames = true
  tags = {
    Name = "aegis-noc-vpc"
  }
}

resource "aws_subnet" "aegis_public_subnet" {
  vpc_id                  = aws_vpc.aegis_noc_vpc.id
  cidr_block              = "10.24.10.0/24"
  map_public_ip_on_launch = true
  tags = {
    Name = "aegis-noc-public-subnet"
  }
}

resource "aws_security_group" "aegis_noc_sg" {
  name        = "aegis-noc-security-group"
  description = "HTTPS and Prometheus exporter ingress"
  vpc_id      = aws_vpc.aegis_noc_vpc.id

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_iam_role" "aegis_noc_ec2_role" {
  name = "AegisNOCCloudWatchReadOnlyRole"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

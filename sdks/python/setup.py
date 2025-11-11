"""Setup script for ModelProxy Python SDK"""

from setuptools import setup, find_packages

with open('README.md', 'r', encoding='utf-8') as f:
    long_description = f.read()

setup(
    name='modelproxy',
    version='1.0.0',
    description='Python SDK for ModelProxy API',
    long_description=long_description,
    long_description_content_type='text/markdown',
    author='ModelProxy',
    packages=find_packages(),
    install_requires=[
        'requests>=2.31.0',
    ],
    python_requires='>=3.8',
)


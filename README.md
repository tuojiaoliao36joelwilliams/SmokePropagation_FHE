# SmokePropagation_FHE

**SmokePropagation_FHE** is a privacy-preserving platform for **wildfire smoke propagation analysis**, enabling public health agencies and environmental researchers to perform secure, collaborative studies using encrypted satellite imagery and meteorological data.  
By leveraging **Fully Homomorphic Encryption (FHE)**, the platform allows computational modeling of smoke spread and air quality impacts without ever exposing raw sensitive data.

---

## Project Overview

Wildfires increasingly threaten public health, air quality, and climate stability.  
Agencies need access to **timely, accurate, and comprehensive data** for prediction and mitigation.  
However, satellite imagery and meteorological datasets often contain sensitive information about geography, infrastructure, and population distribution.  
Traditional analysis workflows may risk exposure of these datasets to third-party cloud providers.

**SmokePropagation_FHE** addresses this by allowing multiple organizations to **jointly analyze encrypted data**.  
FHE ensures that **all computation occurs on ciphertexts**, preserving data privacy while enabling predictive modeling of smoke transport and concentration.

---

## Motivation

### Challenges in Smoke Analysis
- **Data Sensitivity:** Detailed satellite imagery may reveal private infrastructure or personal property.  
- **Collaborative Needs:** Multiple agencies often need to combine datasets to improve accuracy.  
- **Cloud Risks:** Outsourcing computation without encryption exposes sensitive environmental and demographic data.  

### FHE as a Solution
- Supports mathematical operations directly on encrypted data.  
- Enables multi-party data collaboration without revealing individual datasets.  
- Preserves confidentiality while generating actionable predictions about smoke spread and air quality.

---

## Core Features

### Encrypted Satellite and Meteorological Data
- Upload and store satellite imagery and weather sensor data in encrypted form.  
- Ensures that no raw images or meteorological records are visible to the cloud.

### Homomorphic Smoke Propagation Modeling
- Implements FHE-based dispersion models, including wind-driven and diffusion computations.  
- Computes real-time smoke trajectory and concentration maps while maintaining data privacy.

### Multi-Agency Collaboration
- Agencies can combine encrypted datasets without revealing underlying data.  
- Joint analysis improves predictive accuracy for regional smoke coverage and air quality forecasting.

### Air Quality Forecasting
- Calculates pollutant concentrations and exposure risk indices in encrypted form.  
- Results decrypted only by authorized users, ensuring privacy and compliance.

### Dashboard & Visualization
- Visualizes decrypted predictions locally after homomorphic computation.  
- Interactive heatmaps, plume trajectories, and risk zones for decision-makers.

---

## Architecture Overview

### Data Encryption Layer
- Client-side encryption of satellite imagery and weather data using FHE.  
- Supports both approximate (CKKS) and exact (BFV) homomorphic schemes.  
- No unencrypted data leaves local agency systems.

### Homomorphic Computation Layer
- Cloud servers execute encrypted smoke propagation simulations.  
- Includes encrypted wind vector field calculations, diffusion, and chemical transport modeling.  
- Fully privacy-preserving: cloud nodes see only ciphertexts.

### Decryption & Analysis Layer
- Agencies decrypt only the final output (plume maps, risk indices).  
- Local visualization tools allow exploration of smoke patterns and predicted air quality impacts.

---

## Workflow

1. **Encrypt Data**: Agencies encrypt satellite and meteorological datasets locally.  
2. **Upload Encrypted Data**: Encrypted data is sent to cloud computation nodes.  
3. **Homomorphic Simulation**: FHE-based algorithms compute smoke spread trajectories and pollutant dispersion.  
4. **Retrieve Encrypted Results**: Agencies download encrypted predictive maps.  
5. **Decrypt & Visualize**: Authorized users decrypt results locally for analysis and response planning.

---

## Technology Stack

- **FHE Library:** CKKS and BFV schemes for real-number and integer computation  
- **Computation Engine:** Optimized homomorphic arithmetic in C++/Rust  
- **Data Management:** Secure cloud nodes capable of batch ciphertext processing  
- **Frontend:** React + WebAssembly client for encryption, decryption, and visualization  
- **Parallelization:** Distributed encrypted computation for large-scale multi-agency datasets  

---

## Security & Privacy

- **End-to-End Encryption:** All raw and intermediate data remain encrypted.  
- **Key Management:** Only agencies maintain decryption keys.  
- **Data Confidentiality:** Cloud and other collaborators cannot access plaintext satellite or weather data.  
- **Auditability:** Homomorphic computation logs allow reproducibility without exposing sensitive information.  
- **Regulatory Compliance:** Fully supports secure handling of sensitive environmental datasets.

---

## Use Cases

- Regional wildfire smoke monitoring and prediction.  
- Public health risk assessment for particulate exposure.  
- Collaborative multi-agency climate impact studies.  
- Privacy-preserving analysis of satellite and sensor networks.

---

## Advantages

| Traditional Analysis | SmokePropagation_FHE |
|--------------------|--------------------|
| Data must be shared openly | Encrypted computation preserves privacy |
| Limited collaboration due to sensitivity | Multi-party FHE collaboration possible |
| Risk of leaking sensitive geographic info | Zero exposure of raw data |
| Manual aggregation of datasets | Automated, privacy-preserving computation |
| Limited trust in cloud providers | Cryptographic guarantees ensure confidentiality |

---

## Roadmap

- **Phase 1:** Core FHE smoke propagation modeling on encrypted datasets  
- **Phase 2:** Multi-agency encrypted data collaboration  
- **Phase 3:** Integration with local visualization tools and dashboards  
- **Phase 4:** Real-time alerting for air quality indices and public health advisories  
- **Phase 5:** Scalable cloud deployment with GPU-assisted homomorphic computation

---

## Vision

**SmokePropagation_FHE** enables **secure, collaborative, and privacy-preserving environmental modeling**, allowing agencies to protect sensitive data while generating accurate predictions for wildfire smoke propagation and public health impact.

---

Built with 🔥, encryption, and environmental responsibility — empowering secure decision-making for climate and public health agencies.

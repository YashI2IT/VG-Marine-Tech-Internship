-- EV Battery Fault Detection — MySQL Schema
-- Run once to set up the database

CREATE DATABASE IF NOT EXISTS ev_battery;
USE ev_battery;

-- Raw telemetry records (seeded from ev_data_sample.json)
CREATE TABLE IF NOT EXISTS telemetry (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  time_ms         INT            NOT NULL,
  voltage         DECIMAL(6,4)   NOT NULL,
  current         DECIMAL(6,4)   NOT NULL,
  temperature     DECIMAL(6,3)   NOT NULL,
  motor_speed_rpm INT            NOT NULL,
  hall_code       VARCHAR(10),
  estimated_soc   DECIMAL(7,4)   NOT NULL,
  ground_truth_soc DECIMAL(7,4)  NOT NULL,
  residual        DECIMAL(7,4)   NOT NULL,
  soc_error       DECIMAL(8,4)   NOT NULL,
  fault_label     ENUM('Normal','Warning','Fault') NOT NULL,
  rf_pred         ENUM('Normal','Warning','Fault') NOT NULL,
  xgb_pred        ENUM('Normal','Warning','Fault') NOT NULL,
  rf_prob_fault   DECIMAL(10,8),
  rf_prob_normal  DECIMAL(10,8),
  rf_prob_warning DECIMAL(10,8),
  xgb_prob_fault  DECIMAL(10,8),
  xgb_prob_normal DECIMAL(10,8),
  xgb_prob_warning DECIMAL(10,8),
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_fault_label (fault_label),
  INDEX idx_time_ms (time_ms)
);

-- Live predictor logs — persisted across sessions
CREATE TABLE IF NOT EXISTS prediction_log (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  voltage         DECIMAL(6,4)   NOT NULL,
  current         DECIMAL(6,4)   NOT NULL,
  temperature     DECIMAL(6,3)   NOT NULL,
  motor_speed_rpm INT            NOT NULL,
  estimated_soc   DECIMAL(7,4)   NOT NULL,
  ground_truth_soc DECIMAL(7,4)  NOT NULL,
  residual        DECIMAL(7,4)   NOT NULL,
  soc_error       DECIMAL(8,4)   NOT NULL,
  rf_pred         ENUM('Normal','Warning','Fault') NOT NULL,
  xgb_pred        ENUM('Normal','Warning','Fault') NOT NULL,
  logged_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_logged_at (logged_at),
  INDEX idx_rf_pred (rf_pred)
);

-- ============================================================
-- Motor Fault Detection — additional tables
-- ============================================================

CREATE DATABASE IF NOT EXISTS ev_battery;
USE ev_battery;

CREATE TABLE IF NOT EXISTS motor_telemetry (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  -- Key signal statistics
  current_mean    DECIMAL(10,6),
  current_std     DECIMAL(10,6),
  current_max     DECIMAL(10,6),
  current_rms     DECIMAL(10,6),
  current_p2p     DECIMAL(10,6),
  current_skew    DECIMAL(10,6),
  current_kurt    DECIMAL(10,6),
  current_crest   DECIMAL(10,6),
  roto_mean       DECIMAL(10,6),
  roto_std        DECIMAL(10,6),
  roto_max        DECIMAL(10,6),
  roto_rms        DECIMAL(10,6),
  roto_p2p        DECIMAL(10,6),
  roto_skew       DECIMAL(10,6),
  roto_kurt       DECIMAL(10,6),
  roto_crest      DECIMAL(10,6),
  current_freq_ctr DECIMAL(10,6),
  current_spec_area DECIMAL(10,6),
  current_amp_1x  DECIMAL(10,6),
  current_amp_2x  DECIMAL(10,6),
  current_amp_3x  DECIMAL(10,6),
  roto_freq_ctr   DECIMAL(10,6),
  roto_spec_area  DECIMAL(10,6),
  roto_amp_1x     DECIMAL(10,6),
  roto_amp_2x     DECIMAL(10,6),
  roto_amp_3x     DECIMAL(10,6),
  true_class      ENUM('Elec_Damage','Healthy','Mech_Damage','Mech_Elec_Damage') NOT NULL,
  rf_pred         ENUM('Elec_Damage','Healthy','Mech_Damage','Mech_Elec_Damage') NOT NULL,
  xgb_pred        ENUM('Elec_Damage','Healthy','Mech_Damage','Mech_Elec_Damage') NOT NULL,
  dt_pred         ENUM('Elec_Damage','Healthy','Mech_Damage','Mech_Elec_Damage') NOT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_true_class (true_class)
);

CREATE TABLE IF NOT EXISTS motor_prediction_log (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  current_mean    DECIMAL(10,6),
  roto_mean       DECIMAL(10,6),
  current_crest   DECIMAL(10,6),
  roto_rms        DECIMAL(10,6),
  rf_pred         ENUM('Elec_Damage','Healthy','Mech_Damage','Mech_Elec_Damage') NOT NULL,
  xgb_pred        ENUM('Elec_Damage','Healthy','Mech_Damage','Mech_Elec_Damage') NOT NULL,
  dt_pred         ENUM('Elec_Damage','Healthy','Mech_Damage','Mech_Elec_Damage') NOT NULL,
  features_json   JSON,
  logged_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_logged_at (logged_at)
);

import joblib, json, numpy as np, pandas as pd
from sklearn.metrics import confusion_matrix, accuracy_score, classification_report

rf  = joblib.load('Motor/random_forest.pkl')
xgb = joblib.load('Motor/xgboost.pkl')
dt  = joblib.load('Motor/decision-tree.pkl')
le  = joblib.load('Motor/label-encoder.pkl')

# Each model may have been trained on different feature subsets
rf_features  = list(rf.feature_names_in_)
dt_features  = list(dt.feature_names_in_)
# XGBoost stores feature names in booster
try:
    xgb_features = list(xgb.get_booster().feature_names)
except Exception:
    xgb_features = list(xgb.feature_names_in_) if hasattr(xgb, 'feature_names_in_') else rf_features

classes = list(le.classes_)

df = pd.read_csv('Motor/motors.csv')
df = df.drop(columns=['Unnamed: 0'], errors='ignore')

# All unique features across all models (for the data sample)
all_features = list(dict.fromkeys(rf_features + xgb_features + dt_features))

y_true = le.transform(df['Class'])

rf_pred   = rf.predict(df[rf_features])
xgb_pred  = xgb.predict(df[xgb_features])
dt_pred   = dt.predict(df[dt_features])
rf_proba  = rf.predict_proba(df[rf_features])
xgb_proba = xgb.predict_proba(df[xgb_features])
dt_proba  = dt.predict_proba(df[dt_features])

def get_fi(m, feats):
    return {'features': feats, 'importances': [round(float(x), 6) for x in m.feature_importances_]}
def get_cm(yt, yp): return confusion_matrix(yt, yp).tolist()
def get_acc(yt, yp): return round(float(accuracy_score(yt, yp)), 6)
def get_report(yt, yp):
    r = classification_report(yt, yp, target_names=classes, output_dict=True)
    return {c: {'precision': round(r[c]['precision'],4), 'recall': round(r[c]['recall'],4),
                'f1': round(r[c]['f1-score'],4), 'support': int(r[c]['support'])} for c in classes}

# Build sample JSON
sample = df.copy()
sample['rf_pred']  = le.inverse_transform(rf_pred)
sample['xgb_pred'] = le.inverse_transform(xgb_pred)
sample['dt_pred']  = le.inverse_transform(dt_pred)
for i, cls in enumerate(classes):
    key = cls.lower()
    sample[f'rf_prob_{key}']  = [round(float(p[i]), 8) for p in rf_proba]
    sample[f'xgb_prob_{key}'] = [round(float(p[i]), 8) for p in xgb_proba]
    sample[f'dt_prob_{key}']  = [round(float(p[i]), 8) for p in dt_proba]

for col in sample.select_dtypes(include='float64').columns:
    sample[col] = sample[col].round(6)

with open('Motor/motor_data_sample.json', 'w') as f:
    json.dump(sample.to_dict(orient='records'), f)

# Build meta JSON
meta = {
    'labelEncoder': {'classes': classes, 'mapping': {c: int(i) for i, c in enumerate(classes)}},
    'allFeatures': all_features,
    'randomForest': {
        'type': 'RandomForestClassifier', 'accuracy': get_acc(y_true, rf_pred),
        'n_estimators': int(rf.n_estimators), 'max_depth': rf.max_depth,
        'n_features': int(rf.n_features_in_), 'classes': classes,
        'feature_importances': get_fi(rf, rf_features),
        'confusion_matrix': get_cm(y_true, rf_pred),
        'report': get_report(y_true, rf_pred),
    },
    'xgboost': {
        'type': 'XGBClassifier', 'accuracy': get_acc(y_true, xgb_pred),
        'n_estimators': int(xgb.n_estimators), 'max_depth': int(xgb.max_depth) if xgb.max_depth else None,
        'learning_rate': round(float(xgb.learning_rate), 4),
        'n_features': len(xgb_features), 'classes': classes,
        'feature_importances': get_fi(xgb, xgb_features),
        'confusion_matrix': get_cm(y_true, xgb_pred),
        'report': get_report(y_true, xgb_pred),
    },
    'decisionTree': {
        'type': 'DecisionTreeClassifier', 'accuracy': get_acc(y_true, dt_pred),
        'max_depth': dt.max_depth, 'n_features': int(dt.n_features_in_), 'classes': classes,
        'feature_importances': get_fi(dt, dt_features),
        'confusion_matrix': get_cm(y_true, dt_pred),
        'report': get_report(y_true, dt_pred),
    },
}
with open('Motor/motor_meta.json', 'w') as f:
    json.dump(meta, f, indent=2)

print('Done')
print('Classes:', classes)
print('RF features:', len(rf_features), '| XGB features:', len(xgb_features), '| DT features:', len(dt_features))
print('Rows:', len(sample))
print('RF acc:', meta['randomForest']['accuracy'])
print('XGB acc:', meta['xgboost']['accuracy'])
print('DT acc:', meta['decisionTree']['accuracy'])

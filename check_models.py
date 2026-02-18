import google.generativeai as genai
genai.configure(api_key="AIzaSyClg_xG8mtIBu5SRMPScrrX0LkU2grE4ks")
for m in genai.list_models():
    if "generateContent" in m.supported_generation_methods:
        print(m.name)
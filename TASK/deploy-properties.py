import json, subprocess, time, urllib.request, urllib.error

def run(*args): return subprocess.check_output(args, text=True).strip()

old=json.loads(run('docker','inspect','chatbots-app'))[0]
assert not old['Mounts'] and not old['HostConfig']['PortBindings']
backup='chatbots-app-before-contact-form3'
run('docker','rename','chatbots-app',backup); run('docker','stop',backup)
try:
    args=['docker','run','-d','--name','chatbots-app','--restart','unless-stopped','--network','mailcowdockerized_mailcow-network']
    for env in old['Config']['Env']: args.extend(['--env',env])
    args.append('ambern-small-business-chatbots:contact3'); run(*args)
    for _ in range(25):
        try: run('docker','exec','chatbots-app','node','-e',"fetch('http://localhost:3000').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"); break
        except subprocess.CalledProcessError: time.sleep(1)
    else: raise RuntimeError('app not ready')
    run('docker','exec','mailcowdockerized-nginx-mailcow-1','nginx','-t'); run('docker','exec','mailcowdockerized-nginx-mailcow-1','nginx','-s','reload')
    base='https://chatbots.ambern.dev'
    for path in ['/selected-work/small-business-chatbots','/demos/dental-chatbot','/demos/real-estate-chatbot','/demos/home-services-chatbot']:
        with urllib.request.urlopen(base+path,timeout=20) as r: assert r.status==200
        print('HTTP 200',path)
    print('PROPERTIES DEPLOY VERIFIED; rollback:',backup)
except Exception:
    subprocess.run(['docker','rm','-f','chatbots-app'],check=False); run('docker','rename',backup,'chatbots-app'); run('docker','start','chatbots-app'); run('docker','exec','mailcowdockerized-nginx-mailcow-1','nginx','-s','reload'); raise

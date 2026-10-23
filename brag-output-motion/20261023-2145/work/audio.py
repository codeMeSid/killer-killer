import math, random, struct, wave
SR=44100; D=20.0; N=int(SR*D); B=60/96
random.seed(7); buf=[0.0]*N
def add(t0,sig,g=1.0):
    i0=int(t0*SR)
    for k,v in enumerate(sig):
        if i0+k<N: buf[i0+k]+=v*g
def tone(f,dur,dec,w=math.sin):
    return [w(2*math.pi*f*k/SR)*math.exp(-k/SR/dec) for k in range(int(dur*SR))]
def sweep(f0,f1,dur,dec):
    out=[];ph=0
    for k in range(int(dur*SR)):
        f=f0+(f1-f0)*min(1,k/SR/dur); ph+=2*math.pi*f/SR; out.append(math.sin(ph)*math.exp(-k/SR/dec))
    return out
def noise(dur,dec,hp=0.0):
    out=[];lp=0
    for k in range(int(dur*SR)):
        n=random.random()*2-1; lp+=0.3*(n-lp); out.append((n-lp if hp else n)*math.exp(-k/SR/dec))
    return out
for k in range(N):  # A1 drone
    t=k/SR; env=min(1,t/1.5)*min(1,(D-t)/1.0)
    buf[k]+=env*(0.20*math.sin(2*math.pi*55*t)+0.07*math.sin(2*math.pi*110.3*t)+0.04*math.sin(2*math.pi*65.4*t))
arp=[220,261.63,329.63,261.63]
for b in range(32):
    add(b*B,tone(110,0.4,0.12),0.28)
    for h in range(2):
        f=arp[(b*2+h)%4]*(1 if (b//8)%2==0 else 0.75)
        add(b*B+h*B/2,tone(f,0.3,0.07,lambda p:math.sin(p)+0.3*math.sin(2*p)),0.07)
# music peak, then effects ~-6dB under
pk=max(abs(x) for x in buf); buf=[x/pk*0.5 for x in buf]   # music peak 0.5
FX=0.25
for t in (2.5,6.25,11.25,16.25): add(t,noise(0.08,0.012),0.12*FX*2)
for i in range(32): add(2.5+i*B/4,noise(0.02,0.006,1),0.10*FX) if 2.5+i*B/4<3.75 else None  # typing ticks
for i in range(4): add(3.75+i*B,sweep(660,990,0.07,0.05),0.5*FX)                              # blips
add(10.0,noise(0.04,0.035,1),1.0*FX)                                                          # pin clack
add(13.1,sweep(140,45,0.18,0.12),1.6*FX); add(13.1,noise(0.06,0.05),0.9*FX)                   # stamp
g=[]
for k in range(int(0.2*SR)):
    v=math.sin(2*math.pi*(180+900*(k%2000)/2000)*k/SR)*0.6+(random.random()*2-1)*0.4
    v=max(-0.5,min(0.5,v*2)); v=round(v*6)/6; g.append(v*(1-k/(0.2*SR)))
add(16.25,g,0.9*FX)
add(16.25,sweep(120,40,0.4,0.2),1.2*FX)
pk=max(abs(x) for x in buf); s=0.85/pk if pk>0.85 else 1.0
w=wave.open("music.wav","w"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
w.writeframes(b"".join(struct.pack("<h",int(max(-1,min(1,x*s))*32767)) for x in buf))

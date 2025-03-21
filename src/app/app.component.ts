import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Component, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet,HttpClientModule,FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'jarvis-angular';
  command: string = '';
  response: string = '';
  isListening: boolean = false;
  isDisable : boolean = false;
  recognition: any;
  FLASK_API_URL = "https://jarvisai-kp2v.onrender.com/";

  constructor(private http:HttpClient,private ngZone: NgZone){
    const speechRecognition = (window as any).speechRecognition || (window as any).webkitSpeechRecognition
    if(speechRecognition){
      this.recognition = new speechRecognition()
      this.recognition.continous = false
      this.recognition.lang = 'en-US'
      this.recognition.interinmResults = false;

      this.recognition.onstart = () => {
        this.ngZone.run(() => {  // ✅ Ensure UI updates
          this.isDisable = true
          this.isListening = true
          this.response = "Listening...."
        })
        
      }

      this.recognition.onresult = (event:any) => {
        const transcript = event.results[0][0].transcript
        this.command = transcript
        this.recognition.stop(); 
        this.sendCommand()
      }

      this.recognition.onerror = (event:any)=>{
        console.log("speech Recongintion error",event.error)
        this.response = "Error recongnizing speech Try again."
        this.isDisable = false
        this.isListening = false
      }

      this.recognition.onend = () => {
        this.ngZone.run(() => {  // ✅ Ensure UI updates
          this.isDisable = window.speechSynthesis.speaking ? true : false
          this.isListening = false
          this.response ==  "Listening...." ? this.response = "" : this.response = this.response
        })
        
      }

    }
    else{
      console.warn("Speech recognition is not supported in this browser.");
      this.response = "Speech recognition is not supported in your browser.";
    }

  }

  startListening() {
    if (this.recognition) {
      this.recognition.start();
    }
  }

  async sendCommand() {
    if (!this.command.trim()) {
      this.response = "Please say something!";
      this.speakResponse(this.response); 
      return;
    }
    console.log(this.command)
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // this.http.post<{ response: string }>(`http://localhost:8000/process_command`, {
      this.http.post<{ response: string }>(`${this.FLASK_API_URL}/process_command`, {
      command: this.command,
      timezone: userTimezone
    }).subscribe(
      (res) => {this.ngZone.run(() => {  // ✅ Ensure UI updates
        this.setresponse(res);
      });
      },
      (error) => {
        console.error("Error communicating with backend:", error);
        this.response = "Error processing command.";
        this.speakResponse(this.response); 
        this.recognition.stop();
      }
    );
  }
setresponse(res:any){
  if(res.response && res.response['success']){
    window.open(res.response.url,'_blank')
    this.response =`Searching for ${res.response.searchText} on google`
    this.speakResponse(this.response); 
     
  }else{
  this.response = res.response
  console.log(this.response)
  this.speakResponse(this.response); 
  this.recognition.stop();
  }
}

speakResponse(text: string) {
  this.ngZone.run(() => {  // ✅ Ensure UI updates
    this.isDisable = true
  })

  if ('speechSynthesis' in window) {
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = 'en-US';  // ✅ Set language (change as needed)
    speech.rate = 1;         // ✅ Adjust speed (1 = normal)
    speech.pitch = 1;        // ✅ Adjust pitch (1 = normal)
    speech.volume = 1;       // ✅ Adjust volume (1 = max)

    window.speechSynthesis.speak(speech);
    speech.onend = () => {
      this.ngZone.run(() => {  // ✅ Ensure UI updates
        this.isDisable = false
      })
      console.log("Speech has finished.");
    };
  } else {
    console.warn("Speech synthesis is not supported in this browser.");
  }
}

}

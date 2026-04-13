import axios from "axios";
import { useState } from "react";

export default function VideoPanel() {
  const [file, setFile] = useState(null);

  const upload = async () => {
    const form = new FormData();
    form.append("file", file);

    await axios.post("http://localhost:8000/drone/upload", form);
  };

  return (
    <div className="panel">
      <h3>Drone Upload</h3>
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <button onClick={upload}>Upload</button>
    </div>
  );
}
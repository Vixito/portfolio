import { Link } from "react-router-dom";
import Button from "../components/ui/Button";

function About() {
  const aboutImageUrl = "https://tu-cdn.cloudfront.net/about.jpg";

  return (
    <div className="h-screen overflow-hidden py-20 px-4">
      <div className="max-w-6xl mx-auto h-full flex items-center">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center w-full">
          {/* Lado izquierdo: Texto */}
          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              Sobre Mí
            </h1>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
                eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
                enim ad minim veniam, quis nostrud exercitation ullamco laboris
                nisi ut aliquip ex ea commodo consequat.
              </p>
              <p>
                Duis aute irure dolor in reprehenderit in voluptate velit esse
                cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat
                cupidatat non proident, sunt in culpa qui officia deserunt
                mollit anim id est laborum.
              </p>
              <p>
                Sed ut perspiciatis unde omnis iste natus error sit voluptatem
                accusantium doloremque laudantium, totam rem aperiam, eaque ipsa
                quae ab illo inventore veritatis et quasi architecto beatae
                vitae dicta sunt explicabo.
              </p>
            </div>
            <div className="pt-4">
              <Link to="/socials" className="cursor-pointer">
                <Button
                  variant="outline"
                  className="bg-transparent border-0 hover:bg-black/80 cursor-pointer"
                >
                  Sígueme en las redes sociales
                </Button>
              </Link>
            </div>
          </div>

          {/* Lado derecho: Foto */}
          <div className="flex justify-center md:justify-end">
            <img
              src={aboutImageUrl}
              alt="Sobre mí"
              className="w-full max-w-md rounded-lg shadow-lg object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default About;
